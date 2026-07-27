import { buildingRegisterAdapter } from "./building-register";
import { commercialStoreAdapter } from "./commercial-store";
import { estimatedSalesAdapter } from "./estimated-sales";
import { floatingPopulationAdapter } from "./floating-population";
import { incomeConsumptionAdapter } from "./income-consumption";
import { livingPopulationAdapter } from "./living-population";
import { noiseComplaintAdapter } from "./noise-complaint";
import { publicServiceReservationAdapter } from "./public-service-reservation";
import { rentalTransactionAdapter } from "./rental-transaction";
import { residentPopulationAdapter } from "./resident-population";
import { roadExcavationAdapter } from "./road-excavation";

export const sourceAdapters = [livingPopulationAdapter, buildingRegisterAdapter, commercialStoreAdapter, incomeConsumptionAdapter, residentPopulationAdapter, floatingPopulationAdapter, rentalTransactionAdapter, estimatedSalesAdapter, roadExcavationAdapter, noiseComplaintAdapter, publicServiceReservationAdapter];
