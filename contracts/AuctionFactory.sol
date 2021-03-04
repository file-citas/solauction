pragma solidity >=0.4.22 <0.9.0;

import { Auction } from './Auction.sol';

contract AuctionFactory {
    address[] public auctions;

    event AuctionCreated(address auctionContract, address owner, uint numAuctions, address[] allAuctions);

    function createAuction(uint endBlock, uint limit, string memory ipfsHashAdvAsked) public payable {
        Auction newAuction = (new Auction).value(msg.value)(msg.sender, endBlock, limit, ipfsHashAdvAsked);
        auctions.push(address(newAuction));
        emit AuctionCreated(address(newAuction), msg.sender, auctions.length, auctions);
    }

    function allAuctions()
      view
      public
      returns (address[] memory) {
        return auctions;
    }
}
