import { buildingRegisterAdapter } from "./building-register";
import { commercialStoreAdapter } from "./commercial-store";
import { estimatedSalesAdapter } from "./estimated-sales";
import { floatingPopulationAdapter } from "./floating-population";
import { livingPopulationAdapter } from "./living-population";
import { rentalTransactionAdapter } from "./rental-transaction";

export const sourceAdapters = [livingPopulationAdapter, buildingRegisterAdapter, commercialStoreAdapter, floatingPopulationAdapter, rentalTransactionAdapter, estimatedSalesAdapter];
