// Walmart Workday source config.
// host: walmart.wd5.myworkdayjobs.com
// tenant: walmart
// site: WalmartExternal
// id format: WALMART-<jobReqId>, e.g. WALMART-R-2495265

import type { WorkdaySite } from "./workday";

export const WALMART: WorkdaySite = {
  company: "walmart",
  host: "walmart.wd5.myworkdayjobs.com",
  tenant: "walmart",
  site: "WalmartExternal",
  idPrefix: "WALMART",
};

export const COMPANIES: WorkdaySite[] = [WALMART];

export function findCompany(slug: string): WorkdaySite | undefined {
  return COMPANIES.find((c) => c.company.toLowerCase() === slug.toLowerCase());
}
