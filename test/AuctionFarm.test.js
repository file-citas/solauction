const AuctionFactory = artifacts.require('AuctionFactory')
const Auction = artifacts.require('Auction')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('AuctionFactory', (accounts) => {
  let auctionFactory
  before(async () => {
      auctionFactory = await AuctionFactory.new()
  })
  describe('Auction Stuff', async () => {
    it('Check createAuction', async () => {
      let endBlock = 100
      let a = await auctionFactory.createAuction(endBlock)
      let auctions = await auctionFactory.allAuctions()
      assert.equal(auctions.length, 1)
    })
    it('Check placeBid', async () => {
      let endBlock = 100
      let a = await auctionFactory.createAuction(endBlock)
      let auctions = await auctionFactory.allAuctions()
      let auction = await Auction.at(auctions[0])
      auction.placeBid({from: accounts[1], value: 100})
    })
  })
})

