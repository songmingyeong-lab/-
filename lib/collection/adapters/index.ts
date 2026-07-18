import { buildingRegisterAdapter } from "./building-register";
import { commercialStoreAdapter } from "./commercial-store";
import { floatingPopulationAdapter } from "./floating-population";
import { livingPopulationAdapter } from "./living-population";

export const sourceAdapters = [livingPopulationAdapter, buildingRegisterAdapter, commercialStoreAdapter, floatingPopulationAdapter];
