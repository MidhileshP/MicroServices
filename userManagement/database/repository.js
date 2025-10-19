import mongoose from 'mongoose';

export const findOne = async (Model, query, options = {}) => {
  let queryBuilder = Model.findOne(query);

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(pop => queryBuilder = queryBuilder.populate(pop));
    } else {
      queryBuilder = queryBuilder.populate(options.populate);
    }
  }

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.lean) queryBuilder = queryBuilder.lean();

  return await queryBuilder.exec();
};

export const findById = async (Model, id, options = {}) => {
  let queryBuilder = Model.findById(id);

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(pop => queryBuilder = queryBuilder.populate(pop));
    } else {
      queryBuilder = queryBuilder.populate(options.populate);
    }
  }

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.lean) queryBuilder = queryBuilder.lean();

  return await queryBuilder.exec();
};

export const find = async (Model, query, options = {}) => {
  let queryBuilder = Model.find(query);

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(pop => queryBuilder = queryBuilder.populate(pop));
    } else {
      queryBuilder = queryBuilder.populate(options.populate);
    }
  }

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
  if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
  if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
  if (options.lean) queryBuilder = queryBuilder.lean();

  return await queryBuilder.exec();
};

export const create = async (Model, data) => {
  return await Model.create(data);
};

export const updateOne = async (Model, query, updates, options = {}) => {
  const defaultOptions = { new: true, runValidators: true };
  return await Model.findOneAndUpdate(query, updates, { ...defaultOptions, ...options });
};

export const updateById = async (Model, id, updates, options = {}) => {
  const defaultOptions = { new: true, runValidators: true };
  return await Model.findByIdAndUpdate(id, updates, { ...defaultOptions, ...options });
};

export const updateMany = async (Model, query, updates) => {
  const result = await Model.updateMany(query, updates);
  return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
};

export const deleteOne = async (Model, query) => {
  return await Model.findOneAndDelete(query);
};

export const deleteById = async (Model, id) => {
  return await Model.findByIdAndDelete(id);
};

export const deleteMany = async (Model, query) => {
  const result = await Model.deleteMany(query);
  return { deletedCount: result.deletedCount };
};

export const count = async (Model, query) => {
  return await Model.countDocuments(query);
};

export const exists = async (Model, query) => {
  const doc = await Model.exists(query);
  return doc !== null;
};

export const aggregate = async (Model, pipeline) => {
  return await Model.aggregate(pipeline);
};

export const startSession = async () => {
  return await mongoose.startSession();
};

export const withTransaction = async (callback) => {
  const session = await startSession();
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const save = async (document) => {
  return await document.save();
};

export const remove = async (document) => {
  return await document.deleteOne();
};

export const populate = async (document, paths) => {
  return await document.populate(paths);
};

export const bulkWrite = async (Model, operations) => {
  return await Model.bulkWrite(operations);
};

export const insertMany = async (Model, documents) => {
  return await Model.insertMany(documents);
};

export const toObjectId = (id) => {
  return new mongoose.Types.ObjectId(id);
};

export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};
