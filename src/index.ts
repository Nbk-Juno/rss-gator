import { setUser, readConfig } from "./config";

function main() {
  setUser("Juno");
  const config = readConfig();
  console.log(config);
}

main();
