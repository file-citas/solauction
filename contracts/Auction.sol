pragma solidity >=0.4.22 <0.9.0;

contract Auction {
    address public owner;
    uint public endBlock;
    uint public funds;

    // state
    bool public canceled;
    bool public settled;
    address public Bidder0;
    address public Bidder1;
    mapping(address => uint256) public fundsByBidder;
    bool ownerHasWithdrawn;

    event LogBid(address bidder, uint bid, address Bidder0, uint highestBid);
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
        return fundsByBidder[Bidder0];
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
        // Bidder0 and is just increasing their maximum bid).
        uint highestBid = fundsByBidder[Bidder0];
        assert(newBid >= highestBid);

        fundsByBidder[msg.sender] = newBid;

        if (msg.sender != Bidder0) {
           // store second highest bid
           Bidder1 = Bidder0;
           Bidder0 = msg.sender;
        }
        highestBid = newBid;

        emit LogBid(msg.sender, newBid, Bidder0, highestBid);
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
            // @Nik: What does the owner get?
            // In a normal auction it would be the last bid, but how does that tie in with the predictions?
            if (msg.sender == owner) {
                // Owner gets second highest (or highest if there is only one bid) bit
                if(Bidder1 == address(0)) {
                   withdrawalAccount = Bidder0;
                } else {
                   withdrawalAccount = Bidder1;
                }
                withdrawalAmount = fundsByBidder[Bidder1];
                ownerHasWithdrawn = true;
            } else if (msg.sender == Bidder0) {
                // highest bidder gets diff to second highest bid back
                withdrawalAccount = Bidder0;
                // if there is only one big, the bidder has to pay that?
                if(Bidder1 == address(0)) {
                   withdrawalAmount = fundsByBidder[Bidder0];
                } else {
                   withdrawalAmount = fundsByBidder[Bidder0] - fundsByBidder[Bidder1];
                }
            } else {
                // anyone who participated but did not win the auction should be allowed to withdraw
                // the full amount of their funds
                withdrawalAccount = msg.sender;
                withdrawalAmount = fundsByBidder[withdrawalAccount];
            }
        }

        // after withdraw no one should have any more funds
        fundsByBidder[withdrawalAccount] = 0;

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


