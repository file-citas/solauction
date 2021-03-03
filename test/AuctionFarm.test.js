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
	gas.push(0)
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
	gas[i] += r.receipt.gasUsed * tx.gasPrice
      }

      // wait till auction end
      for (i = 0; i < 100000; i++) {
	miner.mine()
	let block2 = await web3.eth.getBlock('latest')
	if(block2.number > block.number + 32) {
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
	gas[i] += r.receipt.gasUsed * tx.gasPrice
      }

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
	let r = await auction.evaluateAuction({from: accounts[i+1]})
	let tx = await web3.eth.getTransaction(r.tx)
	gas[i] += r.receipt.gasUsed * tx.gasPrice
      }

      for (i = 0; i < n_acc; i++) {
	balances1[i] = await web3.eth.getBalance(accounts[i+1])
      }

      for (i = 0; i < n_acc; i++) {
	console.log("A" + (i+1) + " :" + (balances0[i]-balances1[i]-gas[i]));
      }

      f = await auction.getFunds()
      console.log("Funds: " + f)
    })

    //it('Check placeBid', async () => {
    //  const bid = 100000000
    //  await auctionFactory.createAuction(endBlock, limit, desc, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  const balance0 = await web3.eth.getBalance(accounts[1])
    //  const receipt = await auction.placeBid({from: accounts[1], value: bid})
    //  const gasUsed = receipt.receipt.gasUsed;
    //  const tx = await web3.eth.getTransaction(receipt.tx);
    //  const gasPrice = tx.gasPrice
    //  const balance1 = await web3.eth.getBalance(accounts[1])
    //  console.log("tx: " + tx.hash)
    //  console.log("b0: " + balance0)
    //  console.log("b1: " + balance1)
    //  console.log("gu: " + gasUsed)
    //  console.log("gp: " + gasPrice)
    //  console.log("TEST: " + balance1 + " == " + (balance0 - bid - gasUsed * gasPrice))
    //  // Why does this fail sometimes?
    //  assert(balance1 == balance0 - bid - gasUsed * gasPrice, "FAIL: " + balance1 + " != " + (balance0 - bid - gasUsed * gasPrice))
    //})

    //it('Check withdrawBid while running', async () => {
    //  const bid = 100000000
    //  await auctionFactory.createAuction(endBlock, limit, desc, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  const balance0 = await web3.eth.getBalance(accounts[2])
    //  await auction.placeBid({from: accounts[2], value: bid})
    //  await auction.withdraw({from: accounts[2]}).should.be.rejectedWith("still running")
    //})

    //it('Check withdrawBid owner', async () => {
    //  const bid = 100000000
    //  await auctionFactory.createAuction(endBlock, limit, desc, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0
    //  let balance0 = await web3.eth.getBalance(accounts[0])
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  let r = await auction.settleAuction()
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  let balance1 = await web3.eth.getBalance(accounts[0])
    //  //console.log("b0: " + balance0)
    //  //console.log("b1: " + balance1)
    //  //console.log("gp: " + gas)
    //  //console.log("TEST: " + balance1 + " == " + (balance0 - gas + bid))
    //  assert(balance1 == balance0 - gas + bid, "Fail Withdraw: " + balance1 + " == " + (balance0 - gas + bid))
    //})

    //it('Check withdrawBid cancelled', async () => {
    //  const bid = 100000000
    //  await auctionFactory.createAuction(endBlock, limit, desc, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0
    //  let balance0 = await web3.eth.getBalance(accounts[3])
    //  let r = await auction.placeBid({from: accounts[3], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  let balance1 = await web3.eth.getBalance(accounts[3])
    //  assert(balance1 == balance0 - bid - gas, "Fail Bid: " + balance1 + " == " + (balance0 - gas))
    //  await auction.cancelAuction()
    //  r = await auction.withdraw({from: accounts[3]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  balance1 = await web3.eth.getBalance(accounts[3])
    //  //console.log("tx: " + tx.hash)
    //  //console.log("b0: " + balance0)
    //  //console.log("b1: " + balance1)
    //  //console.log("gp: " + gas)
    //  //console.log("TEST: " + balance1 + " == " + (balance0 - gas))
    //  assert(balance1 == balance0 - gas, "Fail Withdraw: " + balance1 + " == " + (balance0 - gas))
    //})

    //it('Check withdrawBid looser', async () => {
    //  const bid = 100000000
    //  await auctionFactory.createAuction(endBlock, limit, desc, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0
    //  let balance0 = await web3.eth.getBalance(accounts[3])
    //  let r = await auction.placeBid({from: accounts[3], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  let balance1 = await web3.eth.getBalance(accounts[3])
    //  assert(balance1 == balance0 - bid - gas, "Fail Bid: " + balance1 + " == " + (balance0 - gas))
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[3]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  balance1 = await web3.eth.getBalance(accounts[3])
    //  //console.log("tx: " + tx.hash)
    //  //console.log("b0: " + balance0)
    //  //console.log("b1: " + balance1)
    //  //console.log("gp: " + gas)
    //  //console.log("TEST: " + balance1 + " == " + (balance0 - gas))
    //  assert(balance1 == balance0 - gas, "Fail Withdraw: " + balance1 + " == " + (balance0 - gas))
    //})

    //it('Check withdrawBid Winner', async () => {
    //  const bid = 100000000
    //  const bid2 = 10000
    //  await auctionFactory.createAuction(endBlock, limit, desc, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0

    //  await auction.placeBid({from: accounts[3], value: bid2})

    //  let balance0 = await web3.eth.getBalance(accounts[4])
    //  let r = await auction.placeBid({from: accounts[4], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice

    //  let balance1 = await web3.eth.getBalance(accounts[4])

    //  //console.log("tx: " + tx.hash)
    //  //console.log("b0: " + balance0)
    //  //console.log("b1: " + balance1)
    //  //console.log("gp: " + gas)
    //  //console.log("TEST: " + balance1 + " == " + (balance0 - gas - bid))

    //  assert(balance1 == balance0 - bid - gas, "Fail Bid: " + balance1 + " == " + (balance0 - gas - bid))

    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[4]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += r.receipt.gasUsed * tx.gasPrice
    //  balance1 = await web3.eth.getBalance(accounts[4])
    //  //console.log("tx: " + tx.hash)
    //  //console.log("b0: " + balance0)
    //  //console.log("b1: " + balance1)
    //  //console.log("gp: " + gas)
    //  //console.log("TEST: " + balance1 + " == " + (balance0 - gas - bid2))
    //  assert(balance1 == balance0 - gas - bid2, "Fail Withdraw: " + balance1 + " == " + (balance0 - gas - bid2))
    //})

  })
})

