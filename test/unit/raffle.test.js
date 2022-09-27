
const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const{developmentChains, networkConfig} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)?describe.skip:describe("Raffle Unit tests", function(){
    let raffle, raffleContract,vrfCoordinatorV2Mock ,  raffleEntranceFee, interval,player //,deployer;
    const chainId = network.config.chainId;
    beforeEach(async()=>{
        accounts = await ethers.getSigners(); 
        //could also done with the getNamedAccounts
        player = accounts[1];
        // deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffleContract = await ethers.getContract("Raffle");
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        raffle = raffleContract.connect(player)
    })

    describe("constructor",  function(){
        it("Initializes the raffle correctly",async function(){
            //Ideally we make our tests have just 1 assert per "it"
            const raffleState = await raffle.getRaffleState();
            interval = await raffle.getInterval();
            raffleEntranceFee = await raffle.getEntranceFee();
            assert.equal(raffleState.toString(),"0");
            assert.equal(interval.toString(),networkConfig[chainId]["keepersUpdateInterval"]);
        })
    })

    describe("enterRaffle",  function(){
        it("reverts when you don't pay enough", async function(){
            await expect(raffle.enterRaffle()).to.be.revertedWith(
                "Raffle__NotEnoughETHEntered"
            )
        })
        it("records players when they enter",async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            const playerFromContract = await raffle.getPlayer(0);
            
            assert.equal(player.address,playerFromContract);
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

         it("doesn't allow entrance when raffle is calculating", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            // we pretend to be a keeper for a second
            await raffle.performUpkeep([]) // changes the state to calculating for our comparison below
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith( // is reverted as raffle is calculating
                "Raffle__RaffleNotOpen"
            )
        })
    })
    describe("checkUpkeep", function () {
        //hasBalance
        it("returns false if people haven't sent any ETH", async () => {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(!upkeepNeeded)
        })
        //raffle --> isOpen
        it("returns false if raffle isn't open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            await raffle.performUpkeep([]) // changes the state to calculating
            const raffleState = await raffle.getRaffleState() // stores the new state
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
        })
        //timePassed
        it("returns false if enough time hasn't passed", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(!upkeepNeeded)
        })
        
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded)
        })
    })

    describe("performUpkeep", function(){
        it("it can only run if checkupkeep is true", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
            await network.provider.send("evm_mine",[]);
            const tx = await raffle.performUpkeep([]);
            assert(tx);
        })
        it("reverts when checkupkeep is false", async function(){
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded");
            /**
             * our test is smart enough to know about the error by the name
             * that it reverts it with all the extra stuff which is in the error.
             * Although we can pass the parameter using string interpolation
             // await expect(raffle.performUpkeep([])).to.be.revertedWith(
                `Raffle__UpkeepNotNeeded(we can put all the stuff here)`);
           
             */ 
        })
        it ("updates the raffle state, emit and event, and calls the vrf coordinator", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee});
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine",[]);
            const txResponse = await raffle.performUpkeep([]);
            const txReceipt = await txResponse.wait(1);
            const requestId = txReceipt.events[1].args.requestId;
            const raffleState = await raffle.getRaffleState();
            assert(requestId.toNumber() > 0);
            assert(raffleState.toString()=="1");
        })
    })

    describe("fulfillRandomWords", function(){
        //we want someone have entered the raffle before running fullfillRandomWords
        beforeEach(async function(){
            //someone entered in the raffle
            await raffle.enterRaffle({value:raffleEntranceFee});
            //increasing block time
            await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
            //mining one block
            await network.provider.send("evm_mine",[]); // method: "evm_mine", params: [] 

        })
        it("can only be called after performUpkeep", async function(){
            //fullfillRandomWords(request_id, sender.address) --> in vrfcoordinatorv2mock.sol
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0,raffle.address)).to.be.revertedWith("nonexistent_request");
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1,raffle.address)).to.be.revertedWith("nonexistent_request");
            
        })
        //success
        // it("success", async function(){

        // })
        //if not success
        it("reverts when success is false", async function(){
            await expect(raffle.fulfillRandomWords()).to.be.revertedWith("Raffle__TransferFailed()");
        })
        //for event
        it("emits event after winnerPicked", async function(){
            await expect(raffle.fulfillRandomWords()).to.emit(raffle,"WinnerPicked");
        })

        //wayyyyyy to big
        it("picks a winner, rests the lottery and sends money", async function(){
            //we are adding additional player other than owner
            const additionalEntrants = 3;
            const startingIndex = 2;
            for(let i=startingIndex; i< startingIndex+additionalEntrants; i++){
                raffle = raffleContract.connect(accounts[i]); //Returns a new instance of the Raffle Contract connected to player
                await raffle.enterRaffle({value: raffleEntranceFee});
            }
            const startingTimeStamp = await raffle.getLastTimeStamp() // storesn starting timestamp(before we fire this event)

            //This will be more imp for our staging test
            await new Promise(async (resolve, reject)=>{
                raffle.once("winnerPicked", async()=> {
                    //event listener for winnerPicked
                    console.log("winnerPicked event fired!");
                    //assert throws an error if it fails, so we need to wrap
                    //it in a try/catch so that the promise returns event
                    //if it fails.

                    try{
                        //Now lets get the ending values...
                        const recentWinner = await raffle.getRecentWinner();
                        const raffleState = await raffle.getRaffleState();
                        const winnerBalance = await accounts[2].getBalance();
                        const endingTimeStamp = await raffle.getLastTimeStamp();
                        await expect (raffle.getPlayer(0)).to.be.reverted;
                        assert.equal(recentWinner.toString(), accounts[2].address);
                        assert.equal(raffleState,0);
                        assert.equal(winnerBalance.toString(),startingBalance.add(raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee)).toString());
                        assert(endingTimeStamp>startingTimeStamp);
                        resolve(); // if try passes, resolves the promise

                    }
                    catch(e){
                        reject(e);
                    }
                })
                //kicking off the event by mocking the chainlink keepers and vrf coordinator
                const tx = await raffle.performUpkeep("0x");
                
                const txReceipt = await tx.wait(1);
                const startingBalance = await accounts[2].getBalance();
                await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address);
            })
        })


    })

})