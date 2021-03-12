const AuctionFactory = artifacts.require('AuctionFactory')
const Auction = artifacts.require('Auction')
const Miner = artifacts.require('Miner')

require('chai')
  .use(require('chai-as-promised'))
  .should()

      //let block = await web3.eth.getBlock('latest')
      //balance0_owner = BigInt(await web3.eth.getBalance(accounts[0]))
      //console.log("B2: " + balance0_owner)
      //console.log("A: " + auction.address)

      //balance0_owner = BigInt(await web3.eth.getBalance(accounts[0]))
      //console.log("B2: " + balance0_owner)

      //var startBlockNumber = block.number
      //let block2 = await web3.eth.getBlock('latest')
      //var endBlockNumber = block2.number
      //for (var i = startBlockNumber; i <= endBlockNumber; i++) {
      //  web3.eth.getBlock(i, function(err, blockInfo) {
      //    if (!blockInfo) {
      //      return;
      //    }
      //    for (var j = 0; j <blockInfo.transactions.length; j++) {
      //      var tx = blockInfo.transactions[j];
      //      web3.eth.getTransaction(tx, function(err, txInfo) {
      //        if(txInfo.from == '0xA4F98E4d6Eca25bEa42c0daD56450132Bf7A204B') {
      //          console.log(txInfo);
      //        }
      //      });
      //    }
      //  });
      //}


contract('AuctionFactory', (accounts) => {
  let miner;
  let auctionFactory
  let blockDiff
  let limit
  let reserve
  let advAsked
  let funds
  const { abi:auctionAbi, bytecode:auctionBytecode } = require('../build/contracts/Auction.json')

  before(async () => {
      blockDiff = 32
      funds = 800000000000
      auctionFactory = await AuctionFactory.new()
      miner = await Miner.new({from: accounts[9]})
      limit = 800000000000
      reserve = 100
      advAsked = "Please Advice" // to be replaced with actual ipfs hash
  })

  async function getSalt() {
    let ret = "0x"
    await web3.eth.getBlock('latest').then(function(b) {
      ret += b.number.toString(16)
    })
    return ret
  }

  async function createNewAuction() {
    salt = await getSalt()
    await auctionFactory.createAuction(salt, blockDiff, reserve, limit, advAsked, {value: funds, from: accounts[0]})
    const auctions = await auctionFactory.allAuctions()
    return await Auction.at(auctions[auctions.length-1])
  }

  async function calcGas(receipt) {
    const gasUsed = BigInt(receipt.receipt.gasUsed)
    const tx = await web3.eth.getTransaction(receipt.tx)
    const gasPrice = BigInt(tx.gasPrice)
    const gas = (gasPrice * gasUsed)
    return gas
  }

  async function endAuction(auction, bd) {
    let llb = await auction.lastBidBlock.call()
    let block = await web3.eth.getBlock('latest')
    for(i=0; i<=bd - (block.number-llb); i++) {
        miner.mine({from: accounts[9]})
    }
  }

  async function getHighestBid(auction) {
    let ret = await auction.bid0.call()
    return Number(ret)
  }

  async function getSecondHighestBid(auction) {
    let ret = await auction.bid1.call()
    return ret
  }

  async function getFunds(auction) {
    let ret = await auction.funds.call()
    return ret
  }

  async function getReserve(auction) {
    let ret = await auction.reserve.call()
    return ret
  }

  function encodeParam(dataType, data) {
    return web3.eth.abi.encodeParameter(dataType, data)
  }

  describe('Auction Stuff', async () => {

    //it('Check createAuction without funds', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {from: accounts[0]}).should.be.rejectedWith("Need Funds")
    //})

    //it('Check createAuction without limit', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, 0, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("Need Limit")
    //})

    //it('Check createAuction limit below reserve', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, reserve-1, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("Limit under reserve")
    //})

    //it('Check createAuction wrong timeout', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number, reserve, limit, advAsked, {value: funds, from: accounts[0]}).should.be.rejectedWith("End time before now")
    //})

    //it('Check createAuctions', async () => {
    //  const n_auc = 16
    //  for(i = 0; i<n_auc; i++) {
    //    await auctionFactory.createAuction(salt + "1".repeat(i), blockDiff, reserve, limit, advAsked, {value: funds, from: accounts[0]})
    //    let auctions = await auctionFactory.allAuctions()
    //    assert.equal(auctions.length, i+1)
    //  }
    //  let auctions = await auctionFactory.allAuctions()
    //  assert.equal(auctions.length, n_auc)
    //  for(i = 0; i<n_auc; i++) {
    //    let auction = await Auction.at(auctions[i])
    //    auction.owner.call().then(function (res) { assert(res == accounts[0])})
    //    auction.blockDiff.call().then(function (res) { assert(res == blockDiff)})
    //    auction.funds.call().then(function (res) { assert(res == funds)})
    //    auction.reserve.call().then(function (res) { assert(res == reserve)})
    //    auction.limit.call().then(function (res) { assert(res == limit)})
    //    auction.result.call().then(function (res) { assert(res == 0)})
    //    auction.rewardPerc.call().then(function (res) { assert(res == 0)})
    //    auction.settled.call().then(function (res) { assert(!res)})
    //    auction.adviced.call().then(function (res) { assert(!res)})
    //    auction.ownerHasWithdrawn.call().then(function (res) { assert(!res)})
    //    auction.winnerHasWithdrawn.call().then(function (res) { assert(!res)})
    //    auction.resultReported.call().then(function (res) { assert(!res)})
    //    auction.bid0.call().then(function (res) { assert(res == 0)})
    //    auction.bid1.call().then(function (res) { assert(res == 0)})
    //  }
    //})

    //it('Check evaluateAuction', async () => {
    //  var n_acc = 4
    //  var bids = []
    //  var balances0 = []
    //  var balances1 = []
    //  var gas = []
    //  bid  = 100000000
    //  bid_step  = 100000000
    //  for (i = 0; i < n_acc; i++) {
    //    bids.push(bid+bid_step*i)
    //    gas.push(BigInt(0))
    //  }
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])

    //  // get initial balances
    //  for (i = 0; i < n_acc; i++) {
    //    balances0[i] = await web3.eth.getBalance(accounts[i+1])
    //  }

    //  // place bids
    //  for (i = 0; i < n_acc; i++) {
    //    console.log("A" + (i+1) + ": bid " + bids[i])
    //    let r = await auction.placeBid({from: accounts[i+1], value: bids[i]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  await auction.evaluateAuction("my advice", {from: accounts[n_acc+1]}).should.be.rejectedWith("not ended")

    //  // wait till auction end
    //  for (i = 0; i < 100000; i++) {
    //    miner.mine()
    //    let block2 = await web3.eth.getBlock('latest')
    //    if(block2.number > block.number + blockDiff) {
    //      break
    //    }
    //  }

    //  let highestBid = await getHighestBid(auction)
    //  let highestBid2 = await getSecondHighestBid(auction)
    //  console.log("Highest Bid: " + highestBid)
    //  console.log("2nd Highest Bid: " + highestBid2)
    //  let f = await getFunds(auction)
    //  console.log("Funds: " + f)

    //  // withdraw bids
    //  for (i = 0; i < n_acc; i++) {
    //    let r = await auction.withdraw({from: accounts[i+1]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  // report result
    //  let res = await getReserve(auction)
    //  console.log("Reserve: " + res)
    //  auction.reportResult(highestBid/2)
    //  auction.result.call().then(function (res) {console.log("Result: " + res)})
    //  auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

    //  // evaluate auction
    //  for (i = 0; i < n_acc; i++) {
    //    let r = await auction.evaluateAuction("my advice " + (i+1), {from: accounts[i+1]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  for (i = 0; i < n_acc; i++) {
    //    balances1[i] = await web3.eth.getBalance(accounts[i+1])
    //  }

    //  for (i = 0; i < n_acc; i++) {
    //    const diff  = BigInt(balances0[i]) - BigInt(balances1[i]) - gas[i]
    //    console.log("A" + (i+1) + " :" + diff);
    //    if(i!=n_acc-1) {
    //      assert(diff == 0)
    //    } else {
    //      assert(-diff == BigInt(funds/2) - BigInt(highestBid2),
    //        "FAIL: " + (-diff) + " == " + (funds/2) + " - " + highestBid + " + " + highestBid2)
    //    }
    //  }

    //  auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
    //  auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc))})
    //  f = await getFunds(auction)
    //  assert(f==0)
    //})

    //it('Check evaluateAuction reserve 0', async () => {
    //  var n_acc = 4
    //  var bids = []
    //  var balances0 = []
    //  var balances1 = []
    //  var gas = []
    //  bid  = 100000000
    //  bid_step  = 100000000
    //  for (i = 0; i < n_acc; i++) {
    //    bids.push(bid+bid_step*i)
    //    gas.push(BigInt(0))
    //  }
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, 0, limit, advAsked, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])

    //  // get initial balances
    //  for (i = 0; i < n_acc; i++) {
    //    balances0[i] = await web3.eth.getBalance(accounts[i+1])
    //  }

    //  // place bids
    //  for (i = 0; i < n_acc; i++) {
    //    console.log("A" + (i+1) + ": bid " + bids[i])
    //    let r = await auction.placeBid({from: accounts[i+1], value: bids[i]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  await auction.evaluateAuction("my advice", {from: accounts[n_acc+1]}).should.be.rejectedWith("not ended")

    //  // wait till auction end
    //  for (i = 0; i < 100000; i++) {
    //    miner.mine()
    //    let block2 = await web3.eth.getBlock('latest')
    //    if(block2.number > block.number + blockDiff) {
    //      break
    //    }
    //  }

    //  let highestBid = await getHighestBid(auction)
    //  let highestBid2 = await getSecondHighestBid(auction)
    //  console.log("Highest Bid: " + highestBid)
    //  console.log("2nd Highest Bid: " + highestBid2)
    //  let f = await getFunds(auction)
    //  console.log("Funds: " + f)

    //  // withdraw bids
    //  for (i = 0; i < n_acc; i++) {
    //    let r = await auction.withdraw({from: accounts[i+1]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  // report result
    //  let res = await getReserve(auction)
    //  console.log("Reserve: " + res)
    //  auction.reportResult(highestBid/2)
    //  auction.result.call().then(function (res) {console.log("Result: " + res)})
    //  auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

    //  // evaluate auction
    //  for (i = 0; i < n_acc; i++) {
    //    let r = await auction.evaluateAuction("my advice " + (i+1), {from: accounts[i+1]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  for (i = 0; i < n_acc; i++) {
    //    balances1[i] = await web3.eth.getBalance(accounts[i+1])
    //  }

    //  for (i = 0; i < n_acc; i++) {
    //    const diff  = BigInt(balances0[i]) - BigInt(balances1[i]) - gas[i]
    //    console.log("A" + (i+1) + " :" + diff);
    //    if(i!=n_acc-1) {
    //      assert(diff == 0)
    //    } else {
    //      assert(-diff == BigInt(funds/2) - BigInt(highestBid2),
    //        "FAIL: " + (-diff) + " == " + (funds/2) + " - " + highestBid + " + " + highestBid2)
    //    }
    //  }

    //  auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
    //  auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc))})
    //  f = await getFunds(auction)
    //  assert(f==0)
    //})


    //it('Check evaluateAuction reserve 3rd', async () => {
    //  var n_acc = 4
    //  var bids = []
    //  var balances0 = []
    //  var balances1 = []
    //  var gas = []
    //  bid  = 100000000
    //  bid_step  = 100000000
    //  for (i = 0; i < n_acc; i++) {
    //    bids.push(bid+bid_step*i)
    //    gas.push(BigInt(0))
    //  }
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, bids[2], limit, advAsked, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])

    //  // get initial balances
    //  for (i = 0; i < n_acc; i++) {
    //    balances0[i] = await web3.eth.getBalance(accounts[i+1])
    //  }

    //  // place bids
    //  for (i = 0; i < n_acc; i++) {
    //    console.log("A" + (i+1) + ": bid " + bids[i])
    //    let r = await auction.placeBid({from: accounts[i+1], value: bids[i]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  await auction.evaluateAuction("my advice", {from: accounts[n_acc+1]}).should.be.rejectedWith("not ended")

    //  // wait till auction end
    //  for (i = 0; i < 100000; i++) {
    //    miner.mine()
    //    let block2 = await web3.eth.getBlock('latest')
    //    if(block2.number > block.number + blockDiff) {
    //      break
    //    }
    //  }

    //  let highestBid = await getHighestBid(auction)
    //  let highestBid2 = await getSecondHighestBid(auction)
    //  console.log("Highest Bid: " + highestBid)
    //  console.log("2nd Highest Bid: " + highestBid2)
    //  let f = await getFunds(auction)
    //  console.log("Funds: " + f)

    //  // withdraw bids
    //  for (i = 0; i < n_acc; i++) {
    //    let r = await auction.withdraw({from: accounts[i+1]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  // report result
    //  let res = await getReserve(auction)
    //  console.log("Reserve: " + res)
    //  let perc = 0.9
    //  auction.reportResult(highestBid*perc)
    //  auction.result.call().then(function (res) {console.log("Result: " + res)})
    //  auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

    //  // evaluate auction
    //  for (i = 0; i < n_acc; i++) {
    //    let r = await auction.evaluateAuction("my advice " + (i+1), {from: accounts[i+1]})
    //    let tx = await web3.eth.getTransaction(r.tx)
    //    gas[i] += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  }

    //  for (i = 0; i < n_acc; i++) {
    //    balances1[i] = await web3.eth.getBalance(accounts[i+1])
    //  }

    //  for (i = 0; i < n_acc; i++) {
    //    const diff  = BigInt(balances0[i]) - BigInt(balances1[i]) - gas[i]
    //    console.log("A" + (i+1) + " :" + diff);
    //    if(i!=n_acc-1) {
    //      assert(diff == 0)
    //    } else {
    //      assert(-diff == BigInt(funds*perc) - BigInt(highestBid2),
    //        "FAIL: " + (-diff) + " == " + (funds*perc) + " - " + highestBid + " + " + highestBid2)
    //    }
    //  }

    //  auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
    //  auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc))})
    //  f = await getFunds(auction)
    //  assert(f==0)
    //})

    it('Check evaluateAuction', async () => {
      var r
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      var gas = []
      let perc = 0.9

      bid  = 100000000
      bid_step  = 100000000
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
        gas.push(BigInt(0))
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await web3.eth.getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        r = await auction.placeBid({from: accounts[i], value: bids[i]})
        gas[i] += await calcGas(r)
      }

      await endAuction(auction, blockDiff)

      let highestBid = await getHighestBid(auction)
      let highestBid2 = await getSecondHighestBid(auction)
      console.log("Highest Bid: " + highestBid)
      console.log("2nd Highest Bid: " + highestBid2)
      let f = await getFunds(auction)
      console.log("Funds: " + f)

      // withdraw bids
      for (i = 0; i < n_acc; i++) {
        r = await auction.withdraw({from: accounts[i]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += await calcGas(r)
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      r = await auction.reportResult(highestBid*perc)
      gas[0] += await calcGas(r)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        r = await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
        gas[i] += await calcGas(r)
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await web3.eth.getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) + gas[i] - BigInt(balances0[i])
        console.log("A" + (i) + " :" + diff);
        if(i==0) {
          console.log("2nd Highest Bid: " + highestBid2)
          assert.equal(diff, highestBid2, "Fail: Account[" + i + "]")
        } else if(i==n_acc-1) {
          assert.equal(diff, BigInt(funds*perc) - BigInt(highestBid2),
            "FAIL: Account[" + i + "]: " + diff + " == " + (funds*perc) + " - " + highestBid + " + " + highestBid2)
        } else {
          assert.equal(diff, 0, "Fail: Account[" + i + "]")
        }
      }

      auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
      auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc-1))})
      f = await getFunds(auction)
      assert.equal(f, 0, "Fail: Funds after eval")
    })

    it('Check evaluateAuction perc 1', async () => {
      var r
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      var gas = []
      let perc = 1.0

      bid  = 100000000
      bid_step  = 100000000
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
        gas.push(BigInt(0))
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await web3.eth.getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        r = await auction.placeBid({from: accounts[i], value: bids[i]})
        gas[i] += await calcGas(r)
      }

      await endAuction(auction, blockDiff)

      let highestBid = await getHighestBid(auction)
      let highestBid2 = await getSecondHighestBid(auction)
      console.log("Highest Bid: " + highestBid)
      console.log("2nd Highest Bid: " + highestBid2)
      let f = await getFunds(auction)
      console.log("Funds: " + f)

      // withdraw bids
      for (i = 0; i < n_acc; i++) {
        r = await auction.withdraw({from: accounts[i]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += await calcGas(r)
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      r = await auction.reportResult(highestBid*perc)
      gas[0] += await calcGas(r)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        r = await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
        gas[i] += await calcGas(r)
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await web3.eth.getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) + gas[i] - BigInt(balances0[i])
        console.log("A" + (i) + " :" + diff);
        if(i==0) {
          console.log("2nd Highest Bid: " + highestBid2)
          assert.equal(diff, highestBid2, "Fail: Account[" + i + "]")
        } else if(i==n_acc-1) {
          assert.equal(diff, BigInt(funds*perc) - BigInt(highestBid2),
            "FAIL: Account[" + i + "]: " + diff + " == " + (funds*perc) + " - " + highestBid + " + " + highestBid2)
        } else {
          assert.equal(diff, 0, "Fail: Account[" + i + "]")
        }
      }

      auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
      auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc-1))})
      f = await getFunds(auction)
      assert.equal(f, 0, "Fail: Funds after eval")
    })

    it('Check evaluateAuction perc 2', async () => {
      var r
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      var gas = []
      let perc = 1.0

      bid  = 100000000
      bid_step  = 100000000
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
        gas.push(BigInt(0))
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await web3.eth.getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        r = await auction.placeBid({from: accounts[i], value: bids[i]})
        gas[i] += await calcGas(r)
      }

      await endAuction(auction, blockDiff)

      let highestBid = await getHighestBid(auction)
      let highestBid2 = await getSecondHighestBid(auction)
      console.log("Highest Bid: " + highestBid)
      console.log("2nd Highest Bid: " + highestBid2)
      let f = await getFunds(auction)
      console.log("Funds: " + f)

      // withdraw bids
      for (i = 0; i < n_acc; i++) {
        r = await auction.withdraw({from: accounts[i]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += await calcGas(r)
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      r = await auction.reportResult(highestBid*perc)
      gas[0] += await calcGas(r)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        r = await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
        gas[i] += await calcGas(r)
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await web3.eth.getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) + gas[i] - BigInt(balances0[i])
        console.log("A" + (i) + " :" + diff);
        if(i==0) {
          console.log("2nd Highest Bid: " + highestBid2)
          assert.equal(diff, highestBid2, "Fail: Account[" + i + "]")
        } else if(i==n_acc-1) {
          assert.equal(diff, BigInt(funds) - BigInt(highestBid2),
            "FAIL: Account[" + i + "]: " + diff + " == " + (funds) + " - " + highestBid + " + " + highestBid2)
        } else {
          assert.equal(diff, 0, "Fail: Account[" + i + "]")
        }
      }

      auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
      auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc-1))})
      f = await getFunds(auction)
      assert.equal(f, 0, "Fail: Funds after eval")
    })

    it('Check evaluateAuction perc 0', async () => {
      var r
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      var gas = []
      let perc = 0.0

      bid  = 100000000
      bid_step  = 100000000
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
        gas.push(BigInt(0))
      }

      let tmp = reserve
      reserve = 0
      let auction = await createNewAuction()
      reserve = tmp

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await web3.eth.getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        r = await auction.placeBid({from: accounts[i], value: bids[i]})
        gas[i] += await calcGas(r)
      }

      await endAuction(auction, blockDiff)

      let highestBid = await getHighestBid(auction)
      let highestBid2 = await getSecondHighestBid(auction)
      console.log("Highest Bid: " + highestBid)
      console.log("2nd Highest Bid: " + highestBid2)
      let f = await getFunds(auction)
      console.log("Funds: " + f)

      // withdraw bids
      for (i = 0; i < n_acc; i++) {
        r = await auction.withdraw({from: accounts[i]})
        let tx = await web3.eth.getTransaction(r.tx)
        gas[i] += await calcGas(r)
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      r = await auction.reportResult(highestBid*perc)
      gas[0] += await calcGas(r)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        r = await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
        gas[i] += await calcGas(r)
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await web3.eth.getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) + gas[i] - BigInt(balances0[i])
        console.log("A" + (i) + " :" + diff);
        if(i==0) {
          console.log("2nd Highest Bid: " + highestBid2)
          assert.equal(diff, highestBid2, "Fail: Account[" + i + "]")
        } else if(i==n_acc-1) {
          assert.equal(diff, BigInt(funds*perc) - BigInt(highestBid2),
            "FAIL: Account[" + i + "]: " + diff + " == " + (funds*perc) + " - " + highestBid + " + " + highestBid2)
        } else {
          assert.equal(diff, 0, "Fail: Account[" + i + "]")
        }
      }

      auction.ipfsHashAdvGiven.call().then(function (res) {console.log("Wining advice: " + res)})
      auction.ipfsHashAdvGiven.call().then(function (res) {assert.equal(res, "my advice " + (n_acc-1))})
      f = await getFunds(auction)
      assert.equal(f, 0, "Fail: Funds after eval")
    })

    it('Check withdraw 1 bid at reserve', async () => {
      let auction = await createNewAuction()

      let gas = 0n
      const bid = reserve

      const balance0 = await web3.eth.getBalance(accounts[1])
      let balance0_owner = await web3.eth.getBalance(accounts[0])

      r = await auction.placeBid({from: accounts[1], value: bid})
      gas += await calcGas(r)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)
      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)

      const balance1 = await web3.eth.getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(gas) - BigInt(reserve)
      assert.equal(balance1, cmp, "FAIL: Account[1]: " + balance1 + " != " + balance0 + " - " + reserve + " - " + gas)

      r = await auction.withdraw({from: accounts[0]})
      let gas_owner = await calcGas(r)
      r = await auction.withdraw({from: accounts[0]})
      gas_owner += await calcGas(r)

      const balance1_owner = await web3.eth.getBalance(accounts[0])
      const cmp_owner = BigInt(balance0_owner) + BigInt(reserve) - BigInt(gas_owner)
      assert.equal(balance1_owner, cmp_owner, "FAIL: Account[0]: " + balance1_owner + " != " + balance0_owner + " - " + gas_owner + " + "  + reserve)
    })


    it('Check withdraw 1 bid at reserve', async () => {
      let auction = await createNewAuction()

      let gas = 0n
      const bid = reserve

      const balance0 = await web3.eth.getBalance(accounts[1])
      let balance0_owner = await web3.eth.getBalance(accounts[0])

      r = await auction.placeBid({from: accounts[1], value: bid})
      gas += await calcGas(r)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)
      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)

      const balance1 = await web3.eth.getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(gas) - BigInt(reserve)
      assert.equal(balance1, cmp, "FAIL: Account[1]: " + balance1 + " != " + balance0 + " - " + reserve + " - " + gas)

      r = await auction.withdraw({from: accounts[0]})
      let gas_owner = await calcGas(r)
      r = await auction.withdraw({from: accounts[0]})
      gas_owner += await calcGas(r)

      const balance1_owner = await web3.eth.getBalance(accounts[0])
      const cmp_owner = BigInt(balance0_owner) + BigInt(reserve) - BigInt(gas_owner)
      assert.equal(balance1_owner, cmp_owner, "FAIL: Account[0]: " + balance1_owner + " != " + balance0_owner + " - " + gas_owner + " + "  + reserve)
    })


    it('Check withdraw 1 bid over reserve', async () => {
      let auction = await createNewAuction()

      let gas = 0n
      const bid = reserve + 1

      const balance0 = await web3.eth.getBalance(accounts[1])
      let balance0_owner = await web3.eth.getBalance(accounts[0])

      let r = await auction.placeBid({from: accounts[1], value: bid})
      gas += await calcGas(r)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)
      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)

      const balance1 = await web3.eth.getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(gas) - BigInt(reserve)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + balance0 + " - " + reserve + " - " + gas)

      r = await auction.withdraw({from: accounts[0]})
      let gas_owner = await calcGas(r)
      r = await auction.withdraw({from: accounts[0]})
      gas_owner += await calcGas(r)

      const balance1_owner = await web3.eth.getBalance(accounts[0])
      const cmp_owner = BigInt(balance0_owner) + BigInt(reserve) - BigInt(gas_owner)
      assert(balance1_owner == cmp_owner, "FAIL: " + balance1_owner + " != " + balance0_owner + " - " + gas_owner + " + "  + reserve)
    })

    it('Check withdraw 1 bid below reserve', async () => {
      let auction = await createNewAuction()
      let gas = 0n
      const balance0 = await web3.eth.getBalance(accounts[1])
      const bid = reserve - 1

      let r = await auction.placeBid({from: accounts[1], value: bid})
      gas += await calcGas(r)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      r = await auction.withdraw({from: accounts[1]})
      gas += await calcGas(r)

      const balance1 = await web3.eth.getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(gas)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + balance0 + " - " + gas)
    })

    it('Check placeBid 1 bid', async () => {
      let auction = await createNewAuction()
      const balance0 = await web3.eth.getBalance(accounts[1])
      const bid = 100000000
      const receipt = await auction.placeBid({from: accounts[1], value: bid})
      gas = await calcGas(receipt)
      let highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")
      const balance1 = await web3.eth.getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(gas) - BigInt(highestBid)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + balance0 + " - " + bid + " - " + gas)
    })

    it('Check placeBid n bid', async () => {
      var r = 0
      var diff = 0
      var n_acc = 5
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

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = BigInt(await web3.eth.getBalance(accounts[i]))
      }

      // place bids (exclude owner account 0)
      for (i = 1; i < n_acc; i++) {
        r = await auction.placeBid({from: accounts[i], value: bids[i]})
        gas[i] += await calcGas(r)
      }

      // get balances after bid
      for (i = 0; i < n_acc; i++) {
        balances1[i] = BigInt(await web3.eth.getBalance(accounts[i]))
      }

      const highestBid = BigInt(await getHighestBid(auction))

      for (i = 0; i < n_acc; i++) {
        if(i==n_acc-1) {
          // highest bidder should have paid gas + bid
          diff = balances0[i] - balances1[i] - gas[i] - highestBid
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + gas[i] + " - " + highestBid)
        } else {
          // everyone but highest bidder should have only paid gas
          diff = balances0[i] - balances1[i] - gas[i]
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + gas[i])
        }
      }
    })

    it('Check placeBid n bid repeat same', async () => {
      var r = 0
      var diff = 0
      var n_acc = 2
      var n_rounds = 16
      var balances0 = []
      var balances1 = []
      var gas = []

      bid  = 100000000
      bid_step  = 100000000
      for (i = 0; i < n_acc; i++) {
        gas.push(BigInt(0))
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = BigInt(await web3.eth.getBalance(accounts[i]))
      }

      // place bids (exclude owner account 0)
      for (j=0; j<n_rounds; j++) {
        for (i = 1; i < n_acc; i++) {
          let new_bid = await getHighestBid(auction)
          new_bid += 100
          r = await auction.placeBid({from: accounts[i], value: new_bid})
          gas[i] += await calcGas(r)
        }
      }

      // get balances after bid
      for (i = 0; i < n_acc; i++) {
        balances1[i] = BigInt(await web3.eth.getBalance(accounts[i]))
      }

      const highestBid = BigInt(await getHighestBid(auction))

      for (i = 0; i < n_acc; i++) {
        if(i==n_acc-1) {
          // highest bidder should have paid gas + bid
          diff = balances0[i] - balances1[i] - gas[i] - highestBid
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + gas[i] + " - " + highestBid)
        } else {
          // everyone but highest bidder should have only paid gas
          diff = balances0[i] - balances1[i] - gas[i]
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + gas[i])
        }
      }
    })

    it('Check placeBid n bid repeat interleave', async () => {
      var highestBidder = 0
      var r = 0
      var diff = 0
      var n_acc = 3
      var n_rounds = 16
      var balances0 = []
      var balances1 = []
      var gas = []

      for (i = 0; i < n_acc; i++) {
        gas.push(BigInt(0))
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = BigInt(await web3.eth.getBalance(accounts[i]))
      }

      // place bids (exclude owner account 0)
      for (i=0; i<n_rounds; i++) {
        let a_idx = (1+(i%(n_acc-1)))
        let new_bid = await getHighestBid(auction)
        new_bid += 100
        r = await auction.placeBid({from: accounts[a_idx], value: new_bid})
        gas[a_idx] += await calcGas(r)
        highestBidder = a_idx
      }

      // get balances after bid
      for (i = 0; i < n_acc; i++) {
        balances1[i] = BigInt(await web3.eth.getBalance(accounts[i]))
      }

      const highestBid = BigInt(await getHighestBid(auction))

      for (i = 0; i < n_acc; i++) {
        if(i==highestBidder) {
          // highest bidder should have paid gas + bid
          diff = balances0[i] - balances1[i] - gas[i] - highestBid
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + gas[i] + " - " + highestBid)
        } else {
          // everyone but highest bidder should have only paid gas
          diff = balances0[i] - balances1[i] - gas[i]
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + gas[i])
        }
      }
    })


    //it('Check placeBid', async () => {
    //  const balance0 = await web3.eth.getBalance(accounts[1])
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  const receipt = await auction.placeBid({from: accounts[1], value: bid})
    //  let highestBid = await getHighestBid(auction)
    //  assert(highestBid == bid)
    //  const gasUsed = receipt.receipt.gasUsed;
    //  const tx = await web3.eth.getTransaction(receipt.tx);
    //  const gasPrice = tx.gasPrice
    //  const balance1 = await web3.eth.getBalance(accounts[1])
    //  const gas = (gasPrice * gasUsed)
    //  const cmp = BigInt(balance0) - BigInt(gas) - BigInt(highestBid)
    //  assert(balance1 == cmp, "FAIL: " + balance1 + " != " + (balance0 - bid - gasUsed * gasPrice))
    //})

    //it('Check placeBid after settle', async () => {
    //  const balance0 = await web3.eth.getBalance(accounts[1])
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  auction.settleAuction()
    //  await auction.placeBid({from: accounts[1], value: bid}).should.be.rejectedWith("settled")
    //})

    //it('Check placeBid after end', async () => {
    //  const balance0 = await web3.eth.getBalance(accounts[1])
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds, from: accounts[0]})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])

    //  // wait till auction end
    //  for (i = 0; i < 100000; i++) {
    //    miner.mine()
    //    let block2 = await web3.eth.getBlock('latest')
    //    if(block2.number > block.number + blockDiff) {
    //      break
    //    }
    //  }
    //  await auction.placeBid({from: accounts[1], value: bid}).should.be.rejectedWith("ended")
    //})

    //it('Check withdraw while running', async () => {
    //  const bid = 100000000
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  const balance0 = await web3.eth.getBalance(accounts[2])
    //  await auction.placeBid({from: accounts[2], value: bid})
    //  await auction.withdraw({from: accounts[2]}).should.be.rejectedWith("still running")
    //})

    //it('Check withdraw under reserve', async () => {
    //  const bid = reserve - 1
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let r
    //  let tx
    //  let balance0 = await web3.eth.getBalance(accounts[1])
    //  r = await auction.placeBid({from: accounts[1], value: bid})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[1]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[1])
    //  const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas))
    //  assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + balance0 + " - " +  gas)
    //})

    //it('Check withdraw winner one bid', async () => {
    //  const bid = 100000000
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let r
    //  let tx
    //  let balance0 = await web3.eth.getBalance(accounts[1])
    //  r = await auction.placeBid({from: accounts[1], value: bid})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[1]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[1])
    //  const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) - BigInt(reserve))
    //  assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + balance0 + " - " +  gas + " - " + reserve)
    //})

    //it('Check withdraw owner one bid', async () => {
    //  const bid = 100000000
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let balance0 = await web3.eth.getBalance(accounts[0])
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  let r = await auction.settleAuction()
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[0])
    //  const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) + BigInt(reserve))
    //  assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(reserve)))
    //})

    //it('Check withdraw owner twice', async () => {
    //  const bid = 100000000
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let balance0 = await web3.eth.getBalance(accounts[0])
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  let r = await auction.settleAuction()
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[0])
    //  const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) + BigInt(bid))
    //  assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(bid)))
    //})

    //it('Check withdraw owner', async () => {
    //  const bid = 100000000
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let balance0 = await web3.eth.getBalance(accounts[0])
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  let r = await auction.settleAuction()
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[0])
    //  const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas) + BigInt(bid))
    //  assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas + BigInt(bid)))
    //})

    //it('Check withdraw owner under reserve', async () => {
    //  const bid = 10
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let balance0 = await web3.eth.getBalance(accounts[0])
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  let r = await auction.settleAuction()
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[0])
    //  const diff = BigInt(balance1) - (BigInt(balance0) - BigInt(gas))
    //  assert(diff == 0n, "Fail Withdraw: " + balance1 + " == " + (BigInt(balance0) - gas))
    //})

    //it('Check withdraw partially under reserve', async () => {
    //  const bid = reserve - 1;
    //  let block = await web3.eth.getBlock('latest')
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas0 = 0n
    //  let gas3 = 0n
    //  let gas4 = 0n
    //  let tx
    //  let r
    //  let balance00 = await web3.eth.getBalance(accounts[0])
    //  let balance03 = await web3.eth.getBalance(accounts[3])
    //  let balance04 = await web3.eth.getBalance(accounts[4])

    //  r = await auction.placeBid({from: accounts[3], value: bid})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas3 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  r = await auction.placeBid({from: accounts[4], value: bid + 1})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas4 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  r = await auction.settleAuction()
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas0 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  r = await auction.withdraw({from: accounts[0]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas0 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  r = await auction.withdraw({from: accounts[3]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas3 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  r = await auction.withdraw({from: accounts[4]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas4 += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  let balance10 = await web3.eth.getBalance(accounts[0])
    //  let balance13 = await web3.eth.getBalance(accounts[3])
    //  let balance14 = await web3.eth.getBalance(accounts[4])

    //  let diff = BigInt(balance10) - (BigInt(balance00) - BigInt(gas0) + BigInt(reserve))
    //  assert(diff == 0n, "Fail Withdraw 0: " + balance10 + " == " + (BigInt(balance00) - gas0 + BigInt(reserve)))
    //  diff = BigInt(balance13) - (BigInt(balance03) - BigInt(gas3))
    //  assert(diff == 0n, "Fail Withdraw 3: " + balance13 + " == " + (BigInt(balance03) - gas3))
    //  diff = BigInt(balance14) - (BigInt(balance04) - BigInt(gas4) - BigInt(reserve))
    //  assert(diff == 0n, "Fail Withdraw 4: " + balance14 + " == " + balance04 + " - " + gas4 + " - " + reserve)
    //})

    //it('Check withdraw looser twice', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let balance0 = await web3.eth.getBalance(accounts[3])
    //  let r = await auction.placeBid({from: accounts[3], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[3])
    //  const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)
    //  assert(diff0 == 0)
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[3]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[3]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  balance1 = await web3.eth.getBalance(accounts[3])
    //  const diff1 = BigInt(balance1) - (BigInt(balance0) - gas)
    //  assert(diff1 == 0)
    //})

    //it('Check withdraw looser', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n
    //  let balance0 = await web3.eth.getBalance(accounts[3])
    //  let r = await auction.placeBid({from: accounts[3], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  let balance1 = await web3.eth.getBalance(accounts[3])
    //  const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)
    //  assert(diff0 == 0)
    //  await auction.placeBid({from: accounts[4], value: bid+bid})
    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[3]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  balance1 = await web3.eth.getBalance(accounts[3])
    //  const diff1 = BigInt(balance1) - (BigInt(balance0) - gas)
    //  assert(diff1 == 0)
    //})

    //it('Check withdraw Winner twice', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  const bid2 = 10000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n

    //  await auction.placeBid({from: accounts[3], value: bid2})

    //  let balance0 = await web3.eth.getBalance(accounts[4])
    //  let r = await auction.placeBid({from: accounts[4], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  let balance1 = await web3.eth.getBalance(accounts[4])

    //  const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)

    //  assert(diff0 == 0)

    //  await auction.settleAuction()
    //  r = await auction.withdraw({from: accounts[4]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  r = await auction.withdraw({from: accounts[4]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  balance1 = await web3.eth.getBalance(accounts[4])

    //  const diff1 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid2) - gas)
    //  assert(diff1 == 0,
    //   "FAIL: " + balance1 + " == " + balance0 + " - " + bid2 + " - " + gas)
    //})


    //it('Check withdraw Winner', async () => {
    //  let block = await web3.eth.getBlock('latest')
    //  const bid = 100000000
    //  const bid2 = 1000000
    //  await auctionFactory.createAuction(salt, block.number + blockDiff, reserve, limit, advAsked, {value: funds})
    //  let auctions = await auctionFactory.allAuctions()
    //  let auction = await Auction.at(auctions[auctions.length-1])
    //  let gas = 0n

    //  await auction.placeBid({from: accounts[3], value: bid2})

    //  let balance0 = await web3.eth.getBalance(accounts[4])
    //  let r = await auction.placeBid({from: accounts[4], value: bid})
    //  let tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)

    //  let balance1 = await web3.eth.getBalance(accounts[4])

    //  const diff0 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid) - gas)

    //  assert(diff0 == 0)

    //  await auction.settleAuction()

    //  r = await auction.withdraw({from: accounts[4]})
    //  tx = await web3.eth.getTransaction(r.tx)
    //  gas += BigInt(r.receipt.gasUsed) * BigInt(tx.gasPrice)
    //  balance1 = await web3.eth.getBalance(accounts[4])

    //  const diff1 = BigInt(balance1) - (BigInt(balance0) - BigInt(bid2) - gas)
    //  assert(diff1 == 0,
    //   "FAIL: " + balance1 + " == " + balance0 + " - " + bid2 + " - " + gas)
    //})

    //it('Check increase bid', async () => {
    //  let auction = await createNewAuction()
    //  const bid = 100000000
    //  const bid2 = 10000
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  let x0 = await getFundsForBidder(auction, accounts[3])
    //  assert.equal(x0 == bid)
    //  await auction.placeBid({from: accounts[3], value: bid2})
    //  let x1 = await getFundsForBidder(auction, accounts[3])
    //  assert(x1 == bid + bid2)
    //})

    //it('Check bid too low', async () => {
    //  let auction = await createNewAuction()
    //  const bid = 100000000
    //  await auction.placeBid({from: accounts[3], value: bid})
    //  await auction.placeBid({from: accounts[4], value: bid-1}).should.be.rejectedWith("Bid too low")
    //  await auction.placeBid({from: accounts[4], value: bid}).should.be.rejectedWith("Bid too low")
    //  await auction.placeBid({from: accounts[4], value: bid+1})
    //  let x1 = await getFundsForBidder(auction, accounts[4])
    //  assert(x1 == bid + 1)
    //})

    it('Check bid too high', async () => {
      let auction = await createNewAuction()
      const bid = limit
      await auction.placeBid({from: accounts[1], value: bid})
      await auction.placeBid({from: accounts[4], value: bid+1}).should.be.rejectedWith("Over limit")
    })

    it('Check second bid', async () => {
      let auction = await createNewAuction()
      const bid = 100000000
      await auction.placeBid({from: accounts[3], value: bid})
      auction.bid1.call().then(function (res) { assert.equal(res, 0)})
      await auction.placeBid({from: accounts[3], value: bid+1})
      auction.bid1.call().then(function (res) { assert.equal(res, bid)})
      await auction.placeBid({from: accounts[4], value: bid+2})
      auction.bid1.call().then(function (res) { assert.equal(res, bid+1)})
      await auction.placeBid({from: accounts[4], value: bid+3})
      auction.bid1.call().then(function (res) { assert.equal(res, bid+2)})
      await auction.placeBid({from: accounts[3], value: bid+4})
      auction.bid1.call().then(function (res) { assert(res == bid+3, "FAIL: 2nd bid: " + (bid+3) + " == " + res)})
    })

    it('Check first vs second bid', async () => {
      let auction = await createNewAuction()
      const bid = 100000000
      await auction.placeBid({from: accounts[3], value: bid})
      await auction.placeBid({from: accounts[4], value: bid+1})
      await auction.placeBid({from: accounts[3], value: bid+2})
      await auction.placeBid({from: accounts[4], value: bid+3})
      await auction.placeBid({from: accounts[3], value: bid+4})
      let second = await getSecondHighestBid(auction)
      assert(second == bid+3)
      let first = await getHighestBid(auction)
      assert(first == bid+4)
    })

  })
})

