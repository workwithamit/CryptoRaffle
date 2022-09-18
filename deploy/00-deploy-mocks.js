const { developmentChains } = require("../helper-hardhat-config");


//BASE_FEE :- it is a premium fee/oracle fee for every request
const BASE_FEE = ethers.utils.parseEther("0.25") //0.25 is the premium. It costs 0.25 LINK per request
//GAS_PRICE_LINK:- it is a calculated value based on the gas price of the chain.
//chainlink Nodes pay the gas fee to give us randomness & do external execution
//so the price of requests change based on the price of gas

const GAS_PRICE_LINK = 1e9;
module.exports = async function({getNamedAccounts, deployments}){
    const{deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if(developmentChains.includes(network.name)){
        log("Local network detected! Deploying mocks....");
        //deploy a mock vrfCoordinator
        await deploy("VRFCoordinatorV2Mock",{
            from:deployer,
            log:true,
            args:args,
        })
        log("Mocks Deployed!");
        log("-----------------------");
    }
}

module.exports.tags = ["all","mocks"];