// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// Note: to be replaced
contract Oracle is Ownable {
   uint256 public result;
   bool public reported;

   function isReported()
   view
   public
   returns (bool)
   {
      return reported;
   }

   function getResult()
   view
   public
   returns (uint256)
   {
      require(reported, "No result yet");
      return result;
   }

   function reportResult(uint256 _result)
   onlyOwner
   public
   returns (bool)
   {
      if(!reported) {
         result = _result;
         reported = true;
      }
      return true;
   }
}
