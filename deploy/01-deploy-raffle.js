const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const {verify} = require("../utils/verify");

const FUND_AMOUNT = "1000000000000000000000"
module.exports = async function({getnamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getnamedAccounts;
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

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"];
    const args = [vrfCoordinatorV2Address,entranceFee];
    const raffle = await deploy("Raffle",
    {
        from: deployer,
        args: args,
        log: true, 
        waitConfirmations: network.config.blockConfirmations || 1,
        

    }
    
    );
}