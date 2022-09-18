const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const {verify} = require("../utils/verify");

const FUND_AMOUNT = "1000000000000000000000"
module.exports = async function({getNamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId

    let vrfCoordinatorV2Address, subscriptionId;

    if(developmentChains.includes(network.name)){
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address; 
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait();
        subscriptionId = transactionReceipt.events[0].args.subId;
        //Fund the subscription
        //our mocks makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId,FUND_AMOUNT);

    }
    else{ 
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinator"] ;
        subscriptionId = networkConfig[chainId]["SubscriptionId"]
    }

    // const waitBlockConfirmations = developmentChains.includes(network.name)?1:VERIFICATION_BLOCK_CONFIRMATIONS;

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"];
    const keepersUpdateInterval = networkConfig[chainId]["keepersUpdateInterval"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const args = [vrfCoordinatorV2Address,subscriptionId,gasLane,entranceFee,callbackGasLimit,keepersUpdateInterval];
    const raffle = await deploy("Raffle",
    {
        from: deployer,
        args: args,
        log: true, 
        waitConfirmations: network.config.blockConfirmations || 1,

    }

    
    
    )
    
    //verifying the deployments 
    if(!developmentChains.includes(network.name)){
        log("verifying.......");
        await verify(raffle.address,args);
    }
    log("-----------------------");
    
}

module.exports.tags=["all", "raffle"]