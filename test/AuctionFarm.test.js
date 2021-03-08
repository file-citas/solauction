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
  let reserve
  let advAsked
  let funds

  before(async () => {
      endBlock = 32
      funds = 800000000000
      auctionFactory = await AuctionFactory.new()
      miner = await Miner.new()
      limit = 800000000000
      reserve = 100
      advAsked = "Please Advice" // to be replaced with actual ipfs hash
  })

  describe('Auction Stuff', async () => {
    it('Check createAuction without funds', async () => {
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {from: accounts[0]}).should.be.rejectedWith("Need Funds")
    })

    it('Check createAuction without limit', async () => {
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, 0, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("Need Limit")
    })

    it('Check createAuction limit below reserve', async () => {
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, reserve-1, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("Limit under reserve")
    })

    it('Check createAuction wrong timeout', async () => {
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number, reserve, limit, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("End time before now")
    })

    it('Check createAuctions', async () => {
      let block = await web3.eth.getBlock('latest')
      const n_auc = 16
      for(i = 0; i<n_auc; i++) {
        await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds, from: accounts[0]})
        let auctions = await auctionFactory.allAuctions()
        assert.equal(auctions.length, i+1)
        await auctionFactory.createAuction(block.number, reserve, limit, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("End time before now")
      }
      let auctions = await auctionFactory.allAuctions()
      assert.equal(auctions.length, n_auc)
      for(i = 0; i<n_auc; i++) {
        let auction = await Auction.at(auctions[i])
        auction.reserve.call().then(function (res) { assert(res == reserve, "FAIL: " + res + " == " + reserve)})
      }
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
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds, from: accounts[0]})
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

      await auction.evaluateAuction("my advice", {from: accounts[n_acc+1]}).should.be.rejectedWith("not ended")

      // wait till auction end
      for (i = 0; i < 100000; i++) {
        miner.mine()
        let block2 = await web3.eth.getBlock('latest')
        if(block2.number > block.number + endBlock) {
          break
        }
      }

      let highestBid = await auction.getHighestBid()
      let highestBid2 = await auction.getSecondHighestBid()
      console.log("Highest Bid: " + highestBid)
      console.log("2nd Highest Bid: " + highestBid2)
      let f = await auction.getFunds()
      console.log("Funds: " + f)

      // withdraw bids
      for (i = 0; i < n_acc; i++) {
        let r = await auction.withdraw({from: accounts[i+1]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      }

      // report result
      auction.reportResult(highestBid/2)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        console.log("A" + i)
        let r = await auction.evaluateAuction("my advice " + (i+1), {from: accounts[i+1]})
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
	  assert(-diff == BigInt(funds/2) - BigInt(highestBid2),
            "FAIL: " + (-diff) + " == " + (funds/2) + " - " + highestBid + " + " + highestBid2)
	}
      }

      auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
      auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc))})
      await auction.evaluateAuction("my new advice", {from: accounts[n_acc]}).should.be.rejectedWith("already adviced")
      f = await auction.getFunds()
      assert(f==0)
    })

    it('Check placeBid', async () => {
      const balance0 = await web3.eth.getBalance(accounts[1])
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds, from: accounts[0]})
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

    it('Check placeBid after cancel', async () => {
      const balance0 = await web3.eth.getBalance(accounts[1])
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds, from: accounts[0]})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      auction.cancelAuction()
      await auction.placeBid({from: accounts[1], value: bid}).should.be.rejectedWith("cancelled")
    })

    it('Check placeBid after settle', async () => {
      const balance0 = await web3.eth.getBalance(accounts[1])
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds, from: accounts[0]})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      auction.settleAuction()
      await auction.placeBid({from: accounts[1], value: bid}).should.be.rejectedWith("settled")
    })

    it('Check placeBid after end', async () => {
      const balance0 = await web3.eth.getBalance(accounts[1])
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds, from: accounts[0]})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])

      // wait till auction end
      for (i = 0; i < 100000; i++) {
        miner.mine()
        let block2 = await web3.eth.getBlock('latest')
        if(block2.number > block.number + endBlock) {
          break
        }
      }
      await auction.placeBid({from: accounts[1], value: bid}).should.be.rejectedWith("ended")
    })

    it('Check withdraw while running', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      const balance0 = await web3.eth.getBalance(accounts[2])
      await auction.placeBid({from: accounts[2], value: bid})
      await auction.withdraw({from: accounts[2]}).should.be.rejectedWith("still running")
    })

    it('Check withdraw under reserve', async () => {
      const bid = reserve - 1
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n
      let r
      let tx
      let balance0 = await web3.eth.getBalance(accounts[1])
      r = await auction.placeBid({from: accounts[1], value: bid})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      await auction.settleAuction()
      r = await auction.withdraw({from: accounts[1]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[1])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas))
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + balance0 + " - " +  gas)
    })

    it('Check withdraw winner one bid', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n
      let r
      let tx
      let balance0 = await web3.eth.getBalance(accounts[1])
      r = await auction.placeBid({from: accounts[1], value: bid})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      await auction.settleAuction()
      r = await auction.withdraw({from: accounts[1]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[1])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) - BigInt(reserve))
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + balance0 + " - " +  gas + " - " + reserve)
    })

    it('Check withdraw owner one bid', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n
      let balance0 = await web3.eth.getBalance(accounts[0])
      await auction.placeBid({from: accounts[3], value: bid})
      let r = await auction.settleAuction()
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      r = await auction.withdraw({from: accounts[0]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[0])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) + BigInt(reserve))
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(reserve)))
    })

    it('Check withdraw owner twice', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      r = await auction.withdraw({from: accounts[0]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      let balance1 = await web3.eth.getBalance(accounts[0])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) + BigInt(bid))
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(bid)))
    })

    it('Check withdraw owner', async () => {
      const bid = 100000000
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(bid)))
    })

    it('Check withdraw owner under reserve', async () => {
      const bid = 10
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas))
      assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas))
    })

    it('Check withdraw partially under reserve', async () => {
      const bid = reserve - 1;
      let block = await web3.eth.getBlock('latest')
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas0 = 0n
      let gas3 = 0n
      let gas4 = 0n
      let tx
      let r
      let balance00 = await web3.eth.getBalance(accounts[0])
      let balance03 = await web3.eth.getBalance(accounts[3])
      let balance04 = await web3.eth.getBalance(accounts[4])

      r = await auction.placeBid({from: accounts[3], value: bid})
      tx = await web3.eth.getTransaction(r.tx)
      gas3 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      r = await auction.placeBid({from: accounts[4], value: bid + 1})
      tx = await web3.eth.getTransaction(r.tx)
      gas4 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      r = await auction.settleAuction()
      tx = await web3.eth.getTransaction(r.tx)
      gas0 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      r = await auction.withdraw({from: accounts[0]})
      tx = await web3.eth.getTransaction(r.tx)
      gas0 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      r = await auction.withdraw({from: accounts[3]})
      tx = await web3.eth.getTransaction(r.tx)
      gas3 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      r = await auction.withdraw({from: accounts[4]})
      tx = await web3.eth.getTransaction(r.tx)
      gas4 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      let balance10 = await web3.eth.getBalance(accounts[0])
      let balance13 = await web3.eth.getBalance(accounts[3])
      let balance14 = await web3.eth.getBalance(accounts[4])

      let diff = BigInt(balance10) - (BigInt(balance00) - BigInt(gas0) + BigInt(reserve))
      assert(diff == 0n, "Fail Withdraw 0: " + balance10 + " == " + (BigInt(balance00) - gas0 + BigInt(reserve)))
      diff = BigInt(balance13) - (BigInt(balance03) - BigInt(gas3))
      assert(diff == 0n, "Fail Withdraw 3: " + balance13 + " == " + (BigInt(balance03) - gas3))
      diff = BigInt(balance14) - (BigInt(balance04) - BigInt(gas4) - BigInt(reserve))
      assert(diff == 0n, "Fail Withdraw 4: " + balance14 + " == " + balance04 + " - " + gas4 + " - " + reserve)
    })

    it('Check withdraw cancelled', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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

    it('Check withdraw cancelled twice', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      r = await auction.withdraw({from: accounts[3]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[3])
      balance1 = await web3.eth.getBalance(accounts[3])
      const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas))
      assert(diff == 0, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas))
    })

    it('Check withdraw looser twice', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      r = await auction.withdraw({from: accounts[3]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[3])
      const diff1 = BigInt(balance1) - (BigInt(balance0) - gas)
      assert(diff1 == 0)
    })

    it('Check withdraw looser', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      const diff1 = BigInt(balance1) - (BigInt(balance0) - gas)
      assert(diff1 == 0)
    })

    it('Check withdraw Winner twice', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      const bid2 = 10000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n

      await auction.placeBid({from: accounts[3], value: bid2})

      let balance0 = await web3.eth.getBalance(accounts[4])
      let r = await auction.placeBid({from: accounts[4], value: bid})
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      let balance1 = await web3.eth.getBalance(accounts[4])

      const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)

      assert(diff0 == 0)

      await auction.settleAuction()
      r = await auction.withdraw({from: accounts[4]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      r = await auction.withdraw({from: accounts[4]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[4])

      const diff1 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid2) - gas)
      assert(diff1 == 0,
       "FAIL: " + balance1 + " == " + balance0 + " - " + bid2 + " - " + gas)
    })


    it('Check withdraw Winner', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      const bid2 = 1000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      let gas = 0n

      await auction.placeBid({from: accounts[3], value: bid2})

      let balance0 = await web3.eth.getBalance(accounts[4])
      let r = await auction.placeBid({from: accounts[4], value: bid})
      let tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

      let balance1 = await web3.eth.getBalance(accounts[4])

      const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)

      assert(diff0 == 0)

      await auction.settleAuction()

      r = await auction.withdraw({from: accounts[4]})
      tx = await web3.eth.getTransaction(r.tx)
      gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
      balance1 = await web3.eth.getBalance(accounts[4])

      const diff1 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid2) - gas)
      assert(diff1 == 0,
       "FAIL: " + balance1 + " == " + balance0 + " - " + bid2 + " - " + gas)
    })

    it('Check increase bid', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      const bid2 = 10000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
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
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      await auction.placeBid({from: accounts[3], value: bid})
      await auction.placeBid({from: accounts[4], value: bid-1}).should.be.rejectedWith("Bid too low")
      await auction.placeBid({from: accounts[4], value: bid}).should.be.rejectedWith("Bid too low")
      await auction.placeBid({from: accounts[4], value: bid+1})
      let x1 = await auction.getFundsForBidder(accounts[4])
      assert(x1 == bid + 1)
    })

    it('Check bid too high', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = limit
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      await auction.placeBid({from: accounts[1], value: bid})
      await auction.placeBid({from: accounts[4], value: bid+1}).should.be.rejectedWith("Over limit")
    })

    it('Check second bid', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      await auction.placeBid({from: accounts[3], value: bid})
      auction.Bid1.call().then(function (res) { assert(res == 0, "FAIL: 2nd bid: " + "0  == " + res)})
      await auction.placeBid({from: accounts[3], value: 1})
      auction.Bid1.call().then(function (res) { assert(res == 0, "FAIL: 2nd bid: " + "0 == " + res)})
      await auction.placeBid({from: accounts[4], value: bid+2})
      auction.Bid1.call().then(function (res) { assert(res == bid+1, "FAIL: 2nd bid: " + (bid+1) + " == " + res)})
      await auction.placeBid({from: accounts[4], value: 1})
      auction.Bid1.call().then(function (res) { assert(res == bid+1, "FAIL: 2nd bid: " + (bid+1) + " == " + res)})
      await auction.placeBid({from: accounts[3], value: 3})
      auction.Bid1.call().then(function (res) { assert(res == bid+3, "FAIL: 2nd bid: " + (bid+3) + " == " + res)})
    })

    it('Check first vs second bid', async () => {
      let block = await web3.eth.getBlock('latest')
      const bid = 100000000
      await auctionFactory.createAuction(block.number + endBlock, reserve, limit, advAsked, {value: funds})
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[auctions.length-1])
      await auction.placeBid({from: accounts[3], value: bid})
      await auction.placeBid({from: accounts[4], value: bid+1})
      await auction.placeBid({from: accounts[3], value: 2})
      await auction.placeBid({from: accounts[4], value: 2})
      await auction.placeBid({from: accounts[3], value: 2})
      let second = await auction.getSecondHighestBid()
      assert(second == bid+2+1)
      let first = await auction.getHighestBid()
      assert(first == bid+2+2)
    })

  })
})

