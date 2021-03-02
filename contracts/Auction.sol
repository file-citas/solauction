pragma solidity >=0.4.22 <0.9.0;

contract Auction {
    address public owner;
    uint public endBlock;
    uint public funds;

    // state
    bool public canceled;
    bool public settled;
    uint public highestBindingBid;
    address public highestBidder;
    mapping(address => uint256) public fundsByBidder;
    bool ownerHasWithdrawn;

    event LogBid(address bidder, uint bid, address highestBidder, uint highestBid, uint highestBindingBid);
    event LogWithdrawal(address withdrawer, address withdrawalAccount, uint amount);
    event LogCanceled();
    event LogSettled();

    constructor(address _owner, uint _endBlock, uint _funds) public {
        require(_endBlock > block.number);
        require(_owner != address(0));

        owner = _owner;
        endBlock = _endBlock;
        funds = _funds;
    }

    function getHighestBid()
        public
        view
        returns (uint)
    {
        return fundsByBidder[highestBidder];
    }

    function placeBid()
        public
        payable
        onlyBeforeEnd
        onlyNotCanceled
        onlyNotOwner
        returns (bool success)
    {
        // reject payments of 0 ETH
        require(msg.value > 0);

        // calculate the user's total bid based on the current amount they've sent to the contract
        // plus whatever has been sent with this transaction
        uint newBid = fundsByBidder[msg.sender] + msg.value;

        // grab the previous highest bid (before updating fundsByBidder, in case msg.sender is the
        // highestBidder and is just increasing their maximum bid).
        uint highestBid = fundsByBidder[highestBidder];
        assert(newBid >= highestBid);

        fundsByBidder[msg.sender] = newBid;

        // if msg.sender is already the highest bidder, they must simply be wanting to raise
        // their maximum bid, in which case we shouldn't increase the highestBindingBid.

        // if the user is NOT highestBidder, and has overbid highestBid completely, we set them
        // as the new highestBidder and recalculate highestBindingBid.

        if (msg.sender != highestBidder) {
           highestBidder = msg.sender;
        }
        highestBid = newBid;

        emit LogBid(msg.sender, newBid, highestBidder, highestBid, highestBindingBid);
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

    function settleAuction()
        onlyOwner
        onlyBeforeEnd
        onlyNotCanceled
        public
        returns (bool success)
    {
        settled = true;
        emit LogSettled();
        return true;
    }

    function cancelAuction()
        onlyOwner
        onlyBeforeEnd
        onlyNotCanceled
        public
        returns (bool success)
    {
        canceled = true;
        emit LogCanceled();
        return true;
    }

    function withdraw()
        onlyEnded
        public
        returns (bool success)
    {
        address withdrawalAccount;
        uint withdrawalAmount;

        if (canceled) {
            // if the auction was canceled, everyone should simply be allowed to withdraw their funds
            withdrawalAccount = msg.sender;
            withdrawalAmount = fundsByBidder[withdrawalAccount];

        } else {
            // the auction finished without being canceled

            if (msg.sender == owner) {
                // the auction's owner should be allowed to withdraw the highestBindingBid
                withdrawalAccount = highestBidder;
                withdrawalAmount = highestBindingBid;
                ownerHasWithdrawn = true;

            } else if (msg.sender == highestBidder) {
                // the highest bidder should only be allowed to withdraw the difference between their
                // highest bid and the highestBindingBid
                withdrawalAccount = highestBidder;
                if (ownerHasWithdrawn) {
                    withdrawalAmount = fundsByBidder[highestBidder];
                } else {
                    withdrawalAmount = fundsByBidder[highestBidder] - highestBindingBid;
                }

            } else {
                // anyone who participated but did not win the auction should be allowed to withdraw
                // the full amount of their funds
                withdrawalAccount = msg.sender;
                withdrawalAmount = fundsByBidder[withdrawalAccount];
            }
        }

        assert(withdrawalAmount != 0);

        fundsByBidder[withdrawalAccount] -= withdrawalAmount;

        // send the funds
        assert(msg.sender.send(withdrawalAmount));

        emit LogWithdrawal(msg.sender, withdrawalAccount, withdrawalAmount);

        return true;
    }

    modifier onlyOwner {
        assert(msg.sender == owner);
        _;
    }

    modifier onlyNotOwner {
        assert(msg.sender != owner);
        _;
    }

    modifier onlyBeforeEnd {
        assert(block.number <= endBlock);
        _;
    }

    modifier onlyNotCanceled {
        assert(!canceled);
        _;
    }

    modifier onlyEnded {
        assert(block.number > endBlock || canceled || settled);
        _;
    }
}


