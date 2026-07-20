import { buildingRegisterAdapter } from "./building-register";
import { commercialStoreAdapter } from "./commercial-store";
import { estimatedSalesAdapter } from "./estimated-sales";
import { floatingPopulationAdapter } from "./floating-population";
import { livingPopulationAdapter } from "./living-population";
import { publicServiceReservationAdapter } from "./public-service-reservation";
import { rentalTransactionAdapter } from "./rental-transaction";
import { roadExcavationAdapter } from "./road-excavation";

export const sourceAdapters = [livingPopulationAdapter, buildingRegisterAdapter, commercialStoreAdapter, floatingPopulationAdapter, rentalTransactionAdapter, estimatedSalesAdapter, roadExcavationAdapter, publicServiceReservationAdapter];
