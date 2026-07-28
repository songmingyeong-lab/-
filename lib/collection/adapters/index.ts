import { buildingRegisterAdapter } from "./building-register";
import { binzibeVacancyAdapter } from "./binzibe-vacancy";
import { commercialStoreAdapter } from "./commercial-store";
import { commercialOpeningMarketAdapter } from "./commercial-opening-market";
import { commercialRentMarketAdapter } from "./commercial-rent-market";
import { estimatedSalesAdapter } from "./estimated-sales";
import { floatingPopulationAdapter } from "./floating-population";
import { incomeConsumptionAdapter } from "./income-consumption";
import { noiseComplaintAdapter } from "./noise-complaint";
import { publicServiceReservationAdapter } from "./public-service-reservation";
import { rentalTransactionAdapter } from "./rental-transaction";
import { residentPopulationAdapter } from "./resident-population";
import { roadExcavationAdapter } from "./road-excavation";

export const sourceAdapters = [buildingRegisterAdapter, binzibeVacancyAdapter, commercialStoreAdapter, commercialOpeningMarketAdapter, commercialRentMarketAdapter, incomeConsumptionAdapter, residentPopulationAdapter, floatingPopulationAdapter, rentalTransactionAdapter, estimatedSalesAdapter, roadExcavationAdapter, noiseComplaintAdapter, publicServiceReservationAdapter];
