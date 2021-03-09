var AuctionFactory = artifacts.require("./AuctionFactory.sol");
var Miner = artifacts.require("./Miner.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Miner);
  deployer.deploy(AuctionFactory);
};
