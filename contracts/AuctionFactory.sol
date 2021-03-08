pragma solidity >=0.4.22 <0.9.0;

import { Auction } from './Auction.sol';

contract AuctionFactory {
    address[] public auctions;

    function createAuction(uint endBlock, uint reserve, uint limit, string memory ipfsHashAdvAsked) public payable {
        Auction newAuction = (new Auction).value(msg.value)(msg.sender, endBlock, reserve, limit, ipfsHashAdvAsked);
        auctions.push(address(newAuction));
    }

    function allAuctions()
      view
      public
      returns (address[] memory) {
        return auctions;
    }
}
