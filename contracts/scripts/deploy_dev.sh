#-----------------
# build
#
echo "------------------------------------------------------------------------------"
echo "Cleaning..."
sozo clean
echo "Building..."
sozo build

#-----------------
# migrate
#
echo ">>> Migrate"
sozo migrate
echo "👍"

#-----------------
# get deployed addresses
#

export MANIFEST_FILE_PATH="./manifest_dev.json"

get_contract_address () {
  local TAG=$1
  local RESULT=$(cat $MANIFEST_FILE_PATH | jq -r ".contracts[] | select(.tag == \"$TAG\" ).address")
  if [[ -z "$RESULT" ]]; then
    >&2 echo "get_contract_address($TAG) not found! 👎"
  fi
  echo $RESULT
}

export TOURNAMENTS_ADDRESS=$(get_contract_address "budokan_1_0_8-tournament_mock")
export GAME_ADDRESS=$(get_contract_address "budokan_1_0_8-game_mock")
export TEST_ERC20=$(get_contract_address "budokan_1_0_8-erc20_mock")
export TEST_ERC721=$(get_contract_address "budokan_1_0_8-erc721_mock")

#-----------------
# initialize tournament
#
echo ">>> Initialize tournament"
echo "GAME_ADDRESS: $GAME_ADDRESS"
echo "TOURNAMENTS_ADDRESS: $TOURNAMENTS_ADDRESS"
echo "TEST_ERC20: $TEST_ERC20"
echo "TEST_ERC721: $TEST_ERC721"

echo "Waiting 10 seconds before execution..."
sleep 10

sozo execute tournament_mock initializer 0 1 $TEST_ERC20 $TEST_ERC721
sozo execute game_mock initializer 0 511226091358943037906894383349784373 15

#------------------
echo "--- DONE! 👍"