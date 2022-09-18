const { network } = require("hardhat");

module.exports = async function({getnamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getnamedAccounts;
    const raffle = await deploy("Raffle",
    {
        from: deployer,
        args: [],
        log: true, 
        waitConfirmations: network.config.blockConfirmations || 1,
        

    }
    
    );
}