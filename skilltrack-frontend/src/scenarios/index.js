/**
 * Scenario Registry
 * 
 * Central lookup table mapping mission IDs to their DSL definitions.
 * To add a new simulation: import it and add a single line here.
 * No engine code needs to change.
 */

import { LINUX_FIX_APACHE } from "./linux/linux-001-fix-apache";
import { GIT_MERGE_CONFLICT } from "./git/git-001-merge-conflict";
import { SQL_FIX_QUERY } from "./sql/sql-001-fix-query";
import { CYBER_INCIDENT_RESPONSE } from "./cyber/cyber-001-incident-response";
import { UBUNTU_MGMT_011_SCENARIO } from "./linux/ubuntu-011-mgmt";
import { APP_DEPLOY_013_SCENARIO } from "./linux/app-deploy-013";
import { EOD_SHUTDOWN_014_SCENARIO } from "./linux/eod-shutdown-014";

export const SCENARIO_REGISTRY = {
  "linux-001": LINUX_FIX_APACHE,
  "git-001":   GIT_MERGE_CONFLICT,
  "sql-001":   SQL_FIX_QUERY,
  "cyber-001": CYBER_INCIDENT_RESPONSE,
  // Map backend IDs to the existing DSL scenarios:
  "GIT_COLLAB_012": GIT_MERGE_CONFLICT,
  "UBUNTU_MGMT_011": UBUNTU_MGMT_011_SCENARIO,
  "CYBER_INCIDENT_004": CYBER_INCIDENT_RESPONSE,
  "APP_DEPLOY_013": APP_DEPLOY_013_SCENARIO,
  "EOD_SHUTDOWN_014": EOD_SHUTDOWN_014_SCENARIO,
};

export const SCENARIO_LIST = Object.values(SCENARIO_REGISTRY);
