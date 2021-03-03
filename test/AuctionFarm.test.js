const AuctionFactory = artifacts.require('AuctionFactory')
const Auction = artifacts.require('Auction')
const Miner = artifacts.require('Miner')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('AuctionFactory', (accounts) => {
  let miner;
  let auctionFactory
  let endBlock
  let limit
  let desc
  let funds

  before(async () => {
      endBlock = 32
      funds = 800000000000
      auctionFactory = await AuctionFactory.new()
      miner = await Miner.new()
      limit = 800000000000
      desc = "TEST AUCTION"
  })

  describe('Auction Stuff', async () => {
    it('Check createAuction without funds', async () => {
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, limit, {from: accounts[0]}).should.be.rejectedWith("Need Funds")
    })

    it('Check createAuction', async () => {
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds, from: accounts[0]})
      let auctions = await auctionFactory.allAuctions()
      assert.equal(auctions.length, 1)
    })

    it('Check evaluateAuction', async () => {
      var n_acc = 4
      var bids = []
      var balances0 = []
      var balances1 = []
      var gas = []
      bid  = 100000000
      bid_step  = 100000000
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
        gas.push(BigInt(0))
      }
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds, from: accounts[0]})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await web3.eth.getBalance(accounts[i+1])
      }

      // place bids
      for (i = 0; i < n_acc; i++) {
        console.log("A" + (i+1) + ": bid " + bids[i])
        let r = await auction.placeBid({from: accounts[i+1], value: bids[i]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      }

      // wait till auction end
      for (i = 0; i < 100000; i++) {
        miner.mine()
        let block2 = await web3.eth.getBlock('latest')
        if(block2.number > block.number + endBlock) {
          break
        }
      }

      let highestBid = await auction.getHighestBid()
      console.log("Highest Bid: " + highestBid)
      let f = await auction.getFunds()
      console.log("Funds: " + f)

      // withdraw bids
      for (i = 0; i < n_acc; i++) {
        let r = await auction.withdraw({from: accounts[i+1]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      }

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        let r = await auction.evaluateAuction({from: accounts[i+1]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await web3.eth.getBalance(accounts[i+1])
      }

      for (i = 0; i < n_acc; i++) {
	const diff  = BigInt(balances0[i]) - BigInt(balances1[i]) - gas[i]
        console.log("A" + (i+1) + " :" + diff);
	if(i!=n_acc-1) {
	  assert(diff == 0)
	} else {
	  assert(-diff == funds/2)
	}
      }

      f = await auction.getFunds()
      assert(f==0)
    })

    it('Check placeBid', async () => {
      const balance0 = await web3.eth.getBalance(accounts[1])
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds, from: accounts[0]})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      const receipt = await auction.placeBid({from: accounts[1], value: bid})
      let highestBid = await auction.getHighestBid()
      assert(highestBid == bid)
      const gasUsed = receipt.receipt.gasUsed;
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = tx.gasPrice
      const balance1 = await web3.eth.getBalance(accounts[1])
      const gas = (gasPrice * gasUsed)
      const cmp = BigInt(balance0) - BigInt(gas) - BigInt(highestBid)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + (balance0 - bid - gasUsed * gasPrice))
    })

    it('Check withdrawBid while running', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      const balance0 = await web3.eth.getBalance(accounts[2])
      await auction.placeBid({from: accounts[2], value: bid})
      await auction.withdraw({from: accounts[2]}).should.be.rejectedWith("still running")
    })

    it('Check withdrawBid owner', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n
      let balance0 = await web3.eth.getBalance(accounts[0])
      await auction.placeBid({from: accounts[3], value: bid})
      await auction.placeBid({from: accounts[4], value: bid+bid})
      let r = await auction.settleAuction()
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      r = await auction.withdraw({from: accounts[0]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[0])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) + BigInt(bid))
      //console.log("b0: " + balance0)
      //console.log("b1: " + balance1)
      //console.log("gp: " + gas)
      //console.log("TEST: " + balance1 + " == " + (balance0 - gas + bid))
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(bid)))
    })

    it('Check withdrawBid cancelled', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n
      let balance0 = await web3.eth.getBalance(accounts[3])
      let r = await auction.placeBid({from: accounts[3], value: bid})
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[3])
      const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - BigInt(gas))
      assert(diff0 == 0)
      await auction.cancelAuction()
      r = await auction.withdraw({from: accounts[3]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[3])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas))
      //console.log("tx: " + tx.hash)
      //console.log("b0: " + balance0)
      //console.log("b1: " + balance1)
      //console.log("gp: " + gas)
      //console.log("TEST: " + balance1 + " == " + (balance0 - gas))
      assert(diff == 0, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas))
    })

    it('Check withdrawBid looser', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n
      let balance0 = await web3.eth.getBalance(accounts[3])
      let r = await auction.placeBid({from: accounts[3], value: bid})
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[3])
      const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)
      assert(diff0 == 0)
      await auction.placeBid({from: accounts[4], value: bid+bid})
      await auction.settleAuction()
      r = await auction.withdraw({from: accounts[3]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[3])
      //console.log("tx: " + tx.hash)
      //console.log("b0: " + balance0)
      //console.log("b1: " + balance1)
      //console.log("gp: " + gas)
      //console.log("TEST: " + balance1 + " == " + (balance0 - gas))
      const diff1 = BigInt(balance1) - (BigInt(balance0) - gas)
      assert(diff1 == 0)
    })

    it('Check withdrawBid Winner', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      const bid2 = 10000
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n

      await auction.placeBid({from: accounts[3], value: bid2})

      let balance0 = await web3.eth.getBalance(accounts[4])
      let r = await auction.placeBid({from: accounts[4], value: bid})
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      let balance1 = await web3.eth.getBalance(accounts[4])

      //console.log("tx: " + tx.hash)
      //console.log("b0: " + balance0)
      //console.log("b1: " + balance1)
      //console.log("gp: " + gas)
      //console.log("TEST: " + balance1 + " == " + (balance0 - gas - bid))
      const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)

      assert(diff0 == 0)

      await auction.settleAuction()
      r = await auction.withdraw({from: accounts[4]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[4])
      //console.log("tx: " + tx.hash)
      //console.log("b0: " + balance0)
      //console.log("b1: " + balance1)
      //console.log("gp: " + gas)
      //console.log("TEST: " + balance1 + " == " + (balance0 - gas - bid2))
      const diff1 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid2) - gas)
      assert(diff1 == 0)
    })

    it('Check increase bid', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      const bid2 = 10000
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      await auction.placeBid({from: accounts[3], value: bid})
      let x0 = await auction.getFundsForBidder(accounts[3])
      assert(x0 == bid)
      await auction.placeBid({from: accounts[3], value: bid2})
      let x1 = await auction.getFundsForBidder(accounts[3])
      assert(x1 == bid + bid2)
    })

    it('Check bid too low', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, limit, desc, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      await auction.placeBid({from: accounts[3], value: bid})
      await auction.placeBid({from: accounts[4], value: bid-1}).should.be.rejectedWith("Bid too low")
      await auction.placeBid({from: accounts[4], value: bid}).should.be.rejectedWith("Bid too low")
      await auction.placeBid({from: accounts[4], value: bid+1})
      let x1 = await auction.getFundsForBidder(accounts[4])
      assert(x1 == bid + 1)
    })

  })
})

