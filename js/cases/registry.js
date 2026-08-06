// ===================================================================
// 暗流 — 案件注册表
// ===================================================================
import { caseData as qingwushan } from './qingwushan.js';
import { caseData as gumu }         from './gumu.js';
import { caseData as huaishu }      from './huaishu.js';
import { caseData as highway444 }   from './highway444.js';

/** 案件数据库 */
export const caseDB = {
  qingwushan,
  gumu,
  huaishu,
  highway444
};

/** 案件展示顺序 */
export const caseOrder = ['qingwushan', 'gumu', 'huaishu', 'highway444'];
