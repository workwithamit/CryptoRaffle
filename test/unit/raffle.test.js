
const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const{developmentChains, networkConfig} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)?describe.skip:describe("Raffle Unit tests", function(){
    let raffle, vrfCoordinatorV2Mock , deployer, raffleEntranceFee, interval;
    const chainId = network.config.chainId;
    beforeEach(async()=>{
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle",deployer);
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
    })

    describe("constructor", async function(){
        it("Initializes the raffle correctly",async function(){
            //Ideally we make our tests have just 1 assert per "it"
            const raffleState = await raffle.getRaffleState();
            interval = await raffle.getInterval();
            raffleEntranceFee = await raffle.getEntranceFee();
            assert.equal(raffleState.toString(),"0");
            assert.equal(interval.toString(),networkConfig[chainId]["keepersUpdateInterval"]);
        })
    })

    describe("enterRaffle", async function(){
        it("reverts when you don't pay enough", async function(){
            await expect(raffle.enterRaffle()).to.be.revertedWith(
                "Raffle__NotEnoughETHEntered"
            )
        })
        it("records players when they enter",async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            const playerFromContract = await raffle.getPlayer(0);
            
            assert.equal(playerFromContract,deployer);
        })
        it("emits event on enter", async function(){
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle,"RaffleEnter")
        })

        /**
         * interval is 30 sec in our contract
         * what if it 10 days
         * do we have to wait for 10 days to test our contract?
         * it sounds ridiculous
         * hardhat comes built in with a ton of functions for us to manipulate our blockchain
         * to do literally whatever we want it to do
         * Hardhat documentation->networks-> hardhat-networks
         */

        /**
         * in checkUpKeep function it is a public function if we call it then transaction will happen
         * but we just the upkeepneeded 
         * so we will use callStatic to get that
         */

        it("doesn't allow entrance when raffle is calculating", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
            await network.provider.send("evm_mine",[]);
            //we pretend to be a chainlink keeper
            await raffle.performUpkeep([]);
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWith("Raffle__RaffleNotOpen");
        })
        describe ("checkUpkeep", async function(){
            it("returns false if people haven't sent any ETH", async function(){
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
                await network.provider.send("evm_mine",[]);
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded);
            })
        })
    })

})