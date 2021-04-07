var AuctionFactory = artifacts.require("./AuctionFactory.sol");
var AuctionNft = artifacts.require("./AuctionNft.sol");
var Miner = artifacts.require("./Miner.sol");
var ForceSend = artifacts.require("./ForceSend.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Miner);
  deployer.deploy(AuctionFactory);
  deployer.deploy(AuctionNft);
  deployer.deploy(ForceSend);
};
