import { MOCK_COLLECTIONS } from './mockData';

const clone = (value) => JSON.parse(JSON.stringify(value));

export const listMockRecords = async (collection) => {
  const records = MOCK_COLLECTIONS[collection];
  if (!records) throw new Error(`Colección MOCK desconocida: ${collection}`);
  return clone(records);
};

export const createMockRecord = async (collection, record) => {
  const records = MOCK_COLLECTIONS[collection];
  if (!records) throw new Error(`Colección MOCK desconocida: ${collection}`);
  const newRecord = {
    ...record,
    id: record.id || `${collection.toUpperCase()}-DEMO-${Date.now()}`,
  };
  records.unshift(newRecord);
  return clone(newRecord);
};

export const updateMockRecord = async (collection, id, changes) => {
  const records = MOCK_COLLECTIONS[collection];
  if (!records) throw new Error(`Colección MOCK desconocida: ${collection}`);
  const index = records.findIndex((record) => String(record.id) === String(id));
  if (index < 0) throw new Error(`No se encontró el registro ${id} en ${collection}.`);
  records[index] = { ...records[index], ...changes, id: records[index].id };
  return clone(records[index]);
};
