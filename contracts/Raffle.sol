//Raffle
//a tamper proof lottery system

//Enter the lottery (paying some amount)
//Pick a random winner (verifiably random)
//Winner to be selected every X minutes -> completely automate
//Chainlink Oracle -> Randomness, Automated Execution (chainlink keeper)

//SPDX-License-Identifier:MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
 
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__RaffleNotOpen();

error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle Contract
 * @author Amit Kumar Sharma
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF version 2(chainlink vrf and chainlink keeper)
 */



contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    /* state variables **/
    //chainlink VRF variables

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    /*Lottery variables */
    uint256 private immutable i_interval;
    uint256 private immutable i_entranceFee;
    uint256 private s_lastTimeStamp;

    address payable[] private s_players;
    address private s_recentWinner;

    RaffleState private s_raffleState;

    /* Event */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 requestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint256 entranceFee,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
        s_raffleState = RaffleState.OPEN;

        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;

        i_callbackGasLimit = callbackGasLimit;
    }

    function enterRaffle() public payable {
        // require(msg.value > i_entranceFee, "Not enough ETH!")

        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        s_players.push(payable(msg.sender));

        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the chainlink Keeper nodes call
     * they look for the 'upkeepNeeded' to return true.
     * The following should be true in order to return true:
     * 1. Our time interval should have passed
     * 2. The lottery should have at least 1 player, and have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The lottery should be in an "open" state.
     */

    function checkUpkeep(
        bytes memory /* checkdata */
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = RaffleState.OPEN == s_raffleState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (timePassed && isOpen && hasPlayers && hasBalance);
    }

    /**
     * @dev Once 'Checkupkeep' is returning 'true', this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    // function requestRandomWinner is transformed to .......
    function performUpkeep(
        bytes calldata /*performData */
    ) external override {
        //Request the random number
        //once we get it, do something with it
        //2 transaction process
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        //require(success)
        //but we're gonna be more gas efficient

        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }
}
