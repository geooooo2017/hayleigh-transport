import type { DeletedJobEntry } from "./deletedJobsBin";
import type { SupportTicket } from "./technicalSupport";
import type { UserCompanyDetails } from "./userCompanyProfile";
import type { BibbyTerms } from "./bibbyFinancing";
import type { Customer, Driver, Job, Vehicle } from "../types";

/** Everything we mirror into PDF backups (no secrets beyond what staff already see in the app). */
export type CompanyBackupSnapshot = {
  exportedAt: string;
  preparedBy?: string;
  userId?: string;
  company: UserCompanyDetails;
  bibby: BibbyTerms;
  customers: Customer[];
  drivers: Driver[];
  vehicles: Vehicle[];
  jobs: Job[];
  deletedBin: DeletedJobEntry[];
  supportTickets: SupportTicket[];
};
