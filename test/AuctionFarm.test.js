const AuctionFactory = artifacts.require('AuctionFactory')
const Auction = artifacts.require('Auction')
const Miner = artifacts.require('Miner')
const ForceSend = artifacts.require('ForceSend');
const { expect } = require('chai');
const { BN, ether, balance } = require('@openzeppelin/test-helpers');
const daiABI = require('./abi/dai');

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

// USER_ADDRESS and DAI_ADDRESS must be
// unlocked in ganache-cli using --unlock
//const { USER_ADDRESS } = process.env;
const USER_ADDRESS = '0xc21d353ff4ee73c572425697f4f5aad2109fe35b';
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
const daiContract = new web3.eth.Contract(daiABI, DAI_ADDRESS);

contract('Truffle Mint DAI', async (accounts) => {
  it('should send ether to the user address', async () => {
    // Send 1 eth to USER_ADDRESS to have gas to send ERC20 txs.
    // Uses ForceSend contract, otherwise sending a normal tx to
    // a contract address that doesn't have a default payable function may revert.
    const forceSend = await ForceSend.new();
    await forceSend.go(USER_ADDRESS, { value: ether('1') });
    const ethBalance = await balance.current(USER_ADDRESS);
    expect(new BN(ethBalance)).to.be.bignumber.least(new BN(ether('1')));
  });

  it('should send DAI to first generated account', async () => {
    // Verify dai balance
    const daiBalance = await daiContract.methods.balanceOf(USER_ADDRESS).call();
    expect(new BN(daiBalance)).to.be.bignumber.least(ether('1'));

    // Send 1 DAI to the first account
    for (const account of accounts.slice(0, 1)) {
      // DAI_ADDRESS and USER_ADDRESS are passed to
      // ganache-cli with flag `--unlock`
      // so we can use the `transfer` method
      await daiContract.methods
        .transfer(account, ether('1').toString())
        .send({ from: USER_ADDRESS, gasLimit: 800000 });
      const daiBalance = await daiContract.methods.balanceOf(account).call();
      expect(new BN(daiBalance)).to.be.bignumber.least(ether('1'));
    }
  });
});


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
    funds = 8000
    auctionFactory = await AuctionFactory.new()
    miner = await Miner.new({from: accounts[9]})
    limit = 8000
    reserve = 64
    advAsked = "Please Advice" // to be replaced with actual ipfs hash
    const forceSend = await ForceSend.new();
    await forceSend.go(USER_ADDRESS, { value: ether('8') });
    const ethBalance = await balance.current(USER_ADDRESS);
    for(i=0; i<6; i++) {
      account = accounts[i]
      let daiBalance = await daiContract.methods.balanceOf(account).call();
      if(daiBalance < ether("1")) {
        await daiContract.methods
          .transfer(account, ether('1').toString())
          .send({ from: USER_ADDRESS, gasLimit: 800000 });
        daiBalance = await daiContract.methods.balanceOf(account).call();
        console.log("Account[" + i + "] DAI: " + daiBalance)
      }
    }
  })

  async function approveAndBid(auction, account, amount) {
    await daiContract.methods.approve(auction.address, amount).send({from: account})
    await auction.placeBid(amount, {from: account})
  }

  async function getBalance(account) {
    const daiBalance = await daiContract.methods.balanceOf(account).call();
    return daiBalance
  }

  async function getSalt() {
    let ret = "0x"
    await web3.eth.getBlock('latest').then(function(b) {
      ret += b.number.toString(16)
    })
    return ret
  }

  async function createNewAuction() {
    //salt = await getSalt()
    await auctionFactory.createAuction(DAI_ADDRESS, blockDiff, reserve, limit, advAsked, {from: accounts[0]})
    const auctions = await auctionFactory.allAuctions()
    let auction = await Auction.at(auctions[auctions.length-1])
    let implementation = await auctionFactory.implementation.call()
    //console.log("I: " + implementation + ", A: " + auction.address)
    assert(auctionFactory.isClone(implementation, auction.address))
    await daiContract.methods
      .approve(auction.address, funds).send({from: accounts[0]})
    await auction.addFunds(funds)
    return auction
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

    it('Check evaluateAuction', async () => {
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      let perc = 0.9

      bid = 400
      bid_step  = 100
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
      }

      let auction = await createNewAuction()

      console.log("A" + (0) + ": bid " + bids[0] + ", balance " + (await getBalance(accounts[0])))
      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i] + ", balance " + (await getBalance(accounts[i])))
        await approveAndBid(auction, accounts[i], bids[i])
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
        await auction.withdraw({from: accounts[i]})
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      await auction.reportResult(highestBid*perc)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) - BigInt(balances0[i])
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
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      let perc = 1.0

      bid = 400
      bid_step  = 100
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        await approveAndBid(auction, accounts[i], bids[i])
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
        await auction.withdraw({from: accounts[i]})
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      r = await auction.reportResult(highestBid*perc)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) - BigInt(balances0[i])
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
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      let perc = 1.0

      bid = 400
      bid_step  = 100
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        await approveAndBid(auction, accounts[i], bids[i])
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
        await web3.eth.getTransaction(r.tx)
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      await auction.reportResult(highestBid*perc)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) - BigInt(balances0[i])
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
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []
      let perc = 0.0

      bid = 400
      bid_step  = 100
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
      }

      let tmp = reserve
      reserve = 0
      let auction = await createNewAuction()
      reserve = tmp

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = await getBalance(accounts[i])
      }

      // place bids
      for (i = 1; i < n_acc; i++) {
        console.log("A" + (i) + ": bid " + bids[i])
        await approveAndBid(auction, accounts[i], bids[i])
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
        await auction.withdraw({from: accounts[i]})
      }

      // report result
      let res = await getReserve(auction)
      console.log("Reserve: " + res)
      await auction.reportResult(highestBid*perc)
      auction.result.call().then(function (res) {console.log("Result: " + res)})
      auction.rewardPerc.call().then(function (res) {console.log("Reward Perc: " + res)})

      // evaluate auction
      for (i = 0; i < n_acc; i++) {
        await auction.evaluateAuction("my advice " + (i), {from: accounts[i]})
      }

      for (i = 0; i < n_acc; i++) {
        balances1[i] = await getBalance(accounts[i])
      }

      for (i = 0; i < n_acc; i++) {
        const diff = BigInt(balances1[i]) - BigInt(balances0[i])
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

      const bid = reserve

      const balance0 = await getBalance(accounts[1])
      let balance0_owner = await getBalance(accounts[0])

      await approveAndBid(auction, accounts[1], bid)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      await auction.withdraw({from: accounts[1]})
      await auction.withdraw({from: accounts[1]})

      const balance1 = await getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(reserve)
      assert.equal(balance1, cmp, "FAIL: Account[1]: " + balance1 + " != " + balance0 + " - " + reserve)

      await auction.withdraw({from: accounts[0]})
      await auction.withdraw({from: accounts[0]})

      const balance1_owner = await getBalance(accounts[0])
      const cmp_owner = BigInt(balance0_owner) + BigInt(reserve)
      assert.equal(balance1_owner, cmp_owner, "FAIL: Account[0]: " + balance1_owner + " != " + balance0_owner + " + "  + reserve)
    })


    it('Check withdraw 1 bid at reserve', async () => {
      let auction = await createNewAuction()

      const bid = reserve

      const balance0 = await getBalance(accounts[1])
      let balance0_owner = await getBalance(accounts[0])

      await approveAndBid(auction, accounts[1], bid)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      await auction.withdraw({from: accounts[1]})
      await auction.withdraw({from: accounts[1]})

      const balance1 = await getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(reserve)
      assert.equal(balance1, cmp, "FAIL: Account[1]: " + balance1 + " != " + balance0 + " - " + reserve)

      await auction.withdraw({from: accounts[0]})
      await auction.withdraw({from: accounts[0]})

      const balance1_owner = await getBalance(accounts[0])
      const cmp_owner = BigInt(balance0_owner) + BigInt(reserve)
      assert.equal(balance1_owner, cmp_owner, "FAIL: Account[0]: " + balance1_owner + " != " + balance0_owner + " + "  + reserve)
    })


    it('Check withdraw 1 bid over reserve', async () => {
      let auction = await createNewAuction()

      const bid = reserve + 1

      const balance0 = await getBalance(accounts[1])
      let balance0_owner = await getBalance(accounts[0])

      await approveAndBid(auction, accounts[1], bid)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      await auction.withdraw({from: accounts[1]})
      await auction.withdraw({from: accounts[1]})

      const balance1 = await getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(reserve)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + balance0 + " - " + reserve)

      await auction.withdraw({from: accounts[0]})
      await auction.withdraw({from: accounts[0]})

      const balance1_owner = await getBalance(accounts[0])
      const cmp_owner = BigInt(balance0_owner) + BigInt(reserve)
      assert(balance1_owner == cmp_owner, "FAIL: " + balance1_owner + " != " + balance0_owner + " + "  + reserve)
    })

    it('Check withdraw 1 bid below reserve', async () => {
      let auction = await createNewAuction()
      const balance0 = await getBalance(accounts[1])
      const bid = reserve - 1

      await approveAndBid(auction, accounts[1], bid)

      const highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")

      await endAuction(auction, blockDiff)

      await auction.withdraw({from: accounts[1]})

      const balance1 = await getBalance(accounts[1])
      const cmp = BigInt(balance0)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + balance0)
    })

    it('Check placeBid 1 bid', async () => {
      let auction = await createNewAuction()
      const balance0 = await getBalance(accounts[1])
      const bid = 100
      await approveAndBid(auction, accounts[1], bid)
      let highestBid = await getHighestBid(auction)
      assert.equal(highestBid, bid, "FAIL: Incorrect highest bid")
      const balance1 = await getBalance(accounts[1])
      const cmp = BigInt(balance0) - BigInt(highestBid)
      assert(balance1 == cmp, "FAIL: " + balance1 + " != " + balance0 + " - " + bid)
    })

    it('Check placeBid n bid', async () => {
      var diff = 0
      var n_acc = 5
      var bids = []
      var balances0 = []
      var balances1 = []

      bid = 10
      bid_step  = 1
      for (i = 0; i < n_acc; i++) {
        bids.push(bid+bid_step*i)
      }

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = BigInt(await getBalance(accounts[i]))
      }

      // place bids (exclude owner account 0)
      for (i = 1; i < n_acc; i++) {
        await approveAndBid(auction, accounts[i], bids[i])
      }

      // get balances after bid
      for (i = 0; i < n_acc; i++) {
        balances1[i] = BigInt(await getBalance(accounts[i]))
      }

      const highestBid = BigInt(await getHighestBid(auction))

      for (i = 0; i < n_acc; i++) {
        if(i==n_acc-1) {
          // highest bidder should have paid bid
          diff = balances0[i] - balances1[i] - highestBid
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + highestBid)
        } else {
          // everyone but highest bidder should have only paid
          diff = balances0[i] - balances1[i]
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i])
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

      bid = 10
      bid_step  = 1

      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = BigInt(await getBalance(accounts[i]))
      }

      // place bids (exclude owner account 0)
      for (j=0; j<n_rounds; j++) {
        for (i = 1; i < n_acc; i++) {
          let new_bid = await getHighestBid(auction)
          new_bid += 100
          await approveAndBid(auction, accounts[i], new_bid)
        }
      }

      // get balances after bid
      for (i = 0; i < n_acc; i++) {
        balances1[i] = BigInt(await getBalance(accounts[i]))
      }

      const highestBid = BigInt(await getHighestBid(auction))

      for (i = 0; i < n_acc; i++) {
        if(i==n_acc-1) {
          // highest bidder should have paid bid
          diff = balances0[i] - balances1[i] - highestBid
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + highestBid)
        } else {
          // everyone but highest bidder should have only paid nothing
          diff = balances0[i] - balances1[i]
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i])
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


      let auction = await createNewAuction()

      // get initial balances
      for (i = 0; i < n_acc; i++) {
        balances0[i] = BigInt(await getBalance(accounts[i]))
      }

      // place bids (exclude owner account 0)
      for (i=0; i<n_rounds; i++) {
        let a_idx = (1+(i%(n_acc-1)))
        let new_bid = await getHighestBid(auction)
        new_bid += 100
        await approveAndBid(auction, accounts[a_idx], new_bid)
        highestBidder = a_idx
      }

      // get balances after bid
      for (i = 0; i < n_acc; i++) {
        balances1[i] = BigInt(await getBalance(accounts[i]))
      }

      const highestBid = BigInt(await getHighestBid(auction))

      for (i = 0; i < n_acc; i++) {
        if(i==highestBidder) {
          // highest bidder should have paid bid
          diff = balances0[i] - balances1[i] - highestBid
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i] + " - " + highestBid)
        } else {
          // everyone but highest bidder should have only paid nothing
          diff = balances0[i] - balances1[i]
          assert(diff == 0, "FAIL: Account[" + i + "]: " + balances0[i] + " != " + balances1[i])
        }
      }
    })

    it('Check bid too high', async () => {
      let auction = await createNewAuction()
      const bid = limit
      await approveAndBid(auction, accounts[1], bid)
      await approveAndBid(auction, accounts[2], bid+1).should.be.rejectedWith("Over limit")
    })

    it('Check second bid', async () => {
      let auction = await createNewAuction()
      const bid = 10
      await approveAndBid(auction, accounts[1], bid)
      auction.bid1.call().then(function (res) { assert.equal(res, 0)})
      await approveAndBid(auction, accounts[1], bid+1)
      auction.bid1.call().then(function (res) { assert.equal(res, bid)})
    })

    it('Check first vs second bid', async () => {
      let auction = await createNewAuction()
      const bid = 100
      await approveAndBid(auction, accounts[1], bid)
      await approveAndBid(auction, accounts[4], bid+1)
      await approveAndBid(auction, accounts[3], bid+2)
      await approveAndBid(auction, accounts[4], bid+3)
      await approveAndBid(auction, accounts[3], bid+4)
      let second = await getSecondHighestBid(auction)
      assert(second == bid+3)
      let first = await getHighestBid(auction)
      assert(first == bid+4)
    })

  })
})
