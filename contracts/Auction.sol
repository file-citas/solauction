pragma solidity >=0.4.22 <0.9.0;

contract Auction {
   uint256 constant divfact = 10000;
   address payable public owner;
   uint public blockDiff; // if more than x blocks after last bid, auction is closed
   uint public lastBidBlock; // when the last bid was placed
   uint public funds;
   uint public reserve;
   uint public limit;
   uint public result; // the outcome
   uint256 public rewardPerc; // the reward percentage based on outcome [0;1]
   string public ipfsHashAdvAsked;
   string public ipfsHashAdvGiven;
   uint public bid0; // highest Bid
   uint public bid1; // 2nd highest Bid
   address payable public bidder0; // highest bidder
   address payable public bidder1; // second highest bidder
   mapping(address => uint256) public fundsByBidder;

   // state
   bool public adviced; // winner can only give advice once
   bool public ownerHasWithdrawn; // owner should only get money once
   bool public winnerHasWithdrawn; // winner should only get money once
   bool public resultReported; // owner can only report the result once

   constructor(address payable _owner, uint _blockDiff, uint _reserve, uint _limit, string memory _ipfsHashAdvAsked) payable {
      require(msg.value > 0, "Need Funds");
      require(_limit > 0, "Need Limit");
      require(_limit>_reserve, "Limit must be higher then reserve");
      require(_blockDiff > 0, "Need block diff > 0");
      require(_owner != address(0), "Invalid owner");

      owner = _owner;
      blockDiff = _blockDiff;
      funds = msg.value;
      reserve = _reserve;
      limit = _limit;
      ipfsHashAdvAsked = _ipfsHashAdvAsked;
      // TODO: should auction start on first bid?
   }

   function placeBid()
      public
      payable
      onlyBeforeEnd
      onlyNotOwner
      returns (bool success)
      {
         require(msg.value > 0, "Bid too low");
         require(msg.value <= limit, "Over limit");
         require(msg.value > bid0, "Bid too low");

         // pay back second highest bid
         if (bidder0 != payable(0)) {
            bid1 = bid0;
            assert(bidder0.send(bid0));
         }
         bidder0 = payable(msg.sender);
         bid0 = msg.value;
         lastBidBlock = block.number;

         return true;
      }

   function min(uint a, uint b)
      private
      pure
      returns (uint)
      {
         if (a < b) return a;
         return b;
      }

   function max(uint a, uint b)
      private
      pure
      returns (uint)
      {
         if (a < b) return b;
         return a;
      }

   function reportResult(uint256 _result)
      onlyAfterFirstBid
      onlyOwner
      onlyAfterEnd
      onlyBeforeResultReported
      onlyReserveMet
      public
      returns (bool success)
      {
         require(_result >= reserve, "Result below reserve");
         require(_result <= limit, "Result over limit");
         result = _result;
         // TODO: How to calculate the factor?
         // penalize only in one direction?
         rewardPerc = uint256(min(bid0, result))*(divfact)/(uint256(bid0));
         resultReported = true;
         return true;
      }

   function withdrawFunds()
      onlyOwner
      onlyAfterEnd
      onlyBeforeFirstBid
      public
      returns (bool success)
      {
         assert(owner.send(funds));
         funds = 0;
         return true;
      }

   function evaluateAuction(string memory _ipfsHashAdvGiven)
      onlyAfterFirstBid
      onlyAfterEnd
      onlyAfterResultReported
      onlyReserveMet
      public
      returns (bool success)
      {
         // I guess checks on the advice hash are unneccessary since it is in the winners best interest to give valid advice?
         // also: should the winner be allowed to change the advice?
         if(!adviced && msg.sender == bidder0) {
            uint256 withdrawalAmount = rewardPerc*(uint256(funds))/(divfact);
            assert(payable(msg.sender).send(withdrawalAmount));
            funds = 0;
            ipfsHashAdvGiven = _ipfsHashAdvGiven;
            adviced = true;
            // TODO: burn or transfer to some other entity
            //require( burn(funds - withdrawalAmount));
         }
         return true;
      }

   function withdraw()
      onlyAfterEnd
      onlyAfterFirstBid
      public
      returns (bool success)
      {
         require(bid0 > bid1, "Sth went wrong");

         if (reserve > bid0) {
            // if reserve is not met, everyone gets their money back
            assert(bidder0.send(bid0));
         } else {
            if (msg.sender == owner) {
               // Owner gets second highest
               if(!ownerHasWithdrawn) {
                  require(owner.send(max(reserve, bid1)));
                  ownerHasWithdrawn = true;
               }
            } else if (msg.sender == bidder0) {
               // highest bidder gets diff to second highest bid back
               if(!winnerHasWithdrawn) {
                  require(bidder0.send(bid0 - max(reserve, bid1)));
                  winnerHasWithdrawn = true;
               }
            }
         }

         return true;
      }

   modifier onlyOwner {
      require(msg.sender == owner, "not owner");
      _;
   }

   modifier onlyNotOwner {
      require(msg.sender != owner, "is owner");
      _;
   }

   modifier onlyBeforeEnd {
      // TODO: should auction start on first bid?
      require(lastBidBlock == 0 || (block.number <= lastBidBlock + blockDiff), "ended");
      _;
   }

   modifier onlyAfterEnd {
      require(lastBidBlock != 0 && (block.number > lastBidBlock + blockDiff), "not ended");
      _;
   }

   modifier onlyBeforeFirstBid {
      require(bid0 == 0 && bidder0 == payable(0), "already have bids");
      _;
   }

   modifier onlyAfterFirstBid {
      require(bid0 > 0 && bidder0 != payable(0), "no bids");
      _;
   }

   modifier onlyReserveMet {
      require(bid0 > reserve, "reserve not met");
      _;
   }

   modifier onlyBeforeResultReported {
      require(!resultReported, "already have result");
      _;
   }

   modifier onlyAfterResultReported {
      require(resultReported, "no result");
      _;
   }

}


