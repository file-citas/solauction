// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionNft is ERC721Burnable, Ownable {
   using Counters for Counters.Counter;
   Counters.Counter private _tokenIds;
   mapping(uint256 => string) public advGiven; // stores the advice given for each token (needs to be changable)

   constructor() ERC721("AUCTION-NFT", "NAUC") {}

   function setAdvice(uint256 tokenId, string memory adv)
   public
   {
      require(ownerOf(tokenId) == msg.sender, "not owner");
      advGiven[tokenId] = adv;
   }

   function mintNft(address receiver, string memory tokenURI) external onlyOwner returns (uint256) {
      _tokenIds.increment();

      uint256 newNftTokenId = _tokenIds.current();
      _mint(receiver, newNftTokenId);
      _setTokenURI(newNftTokenId, tokenURI);

      return newNftTokenId;
   }
}
