pragma solidity >=0.4.22 <0.9.0;
// used to "waste" blocks for truffle tests
contract Miner {
    uint blocksMined;

    constructor() {
        blocksMined = 0;
    }

    function mine() public {
       blocksMined += 1;
    }
}

