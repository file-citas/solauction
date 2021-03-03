var AuctionFactory = artifacts.require("./AuctionFactory.sol");
var Miner = artifacts.require("./Miner.sol");
// var Auction = artifacts.require("./Auction.sol");

module.exports = function(deployer) {
  deployer.deploy(Miner);
  deployer.deploy(AuctionFactory);
};
