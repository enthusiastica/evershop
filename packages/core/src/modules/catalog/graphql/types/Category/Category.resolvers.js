const { select } = require('@evershop/mysql-query-builder');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { camelCase } = require('../../../../../lib/util/camelCase');
const uniqid = require('uniqid');
const { getProductsQuery } = require('../../../services/getProductsQuery');

module.exports = {
  Query: {
    category: async (_, { id }, { pool }) => {
      const query = select().from('category');
      query.leftJoin('category_description')
        .on('category_description.`category_description_category_id`', '=', 'category.`category_id`')
      query.where('category_id', '=', id)
        .andWhere('category.`status`', '=', 1);
      const result = await query.load(pool)
      return result ? camelCase(result) : null;
    },
    categories: async (_, { filters = [] }, { pool }) => {
      const query = select().from('category');
      query.leftJoin('category_description', 'des')
        .on('des.`category_description_category_id`', '=', 'category.`category_id`');

      const currentFilters = [];
      // Name filter
      const nameFilter = filters.find((f) => f.key === 'name');
      if (nameFilter) {
        query.andWhere('des.`name`', 'LIKE', `%${nameFilter.value}%`);
        currentFilters.push({ key: 'name', operation: '=', value: nameFilter.value });
      }

      // Status filter
      const statusFilter = filters.find((f) => f.key === 'status');
      if (statusFilter) {
        query.andWhere('category.`status`', '=', statusFilter.value);
        currentFilters.push({ key: 'status', operation: '=', value: statusFilter.value });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find((f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'name') {
        query.orderBy('des.`name`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('category.`category_id`', "DESC");
      };
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(category.`category_id`)', 'total');
      // const total = await cloneQuery.load(pool);
      // console.log('total', total);
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 };// TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit((page.value - 1) * parseInt(limit.value), parseInt(limit.value));
      return {
        items: (await query.execute(pool)).map(row => camelCase(row)),
        total: (await cloneQuery.load(pool))['total'],
        currentFilters: currentFilters,
      }
    },
    products: async (_, { filters = [] }, { pool, tokenPlayload }) => {
      const query = select()
        .from('product');
      query.leftJoin('product_description', 'des')
        .on('product.`product_id`', '=', 'des.`product_description_product_id`');
      const currentFilters = [];
      // Price filter 
      const priceFilter = filters.find((f) => f.key === 'price');
      if (priceFilter) {
        const [min, max] = priceFilter.value.split('-').map((v) => parseFloat(v));
        let currentPriceFilter;
        if (isNaN(min) === false) {
          query.andWhere('product.`price`', '>=', min);
          currentPriceFilter = { key: 'price', operation: '=', value: `${min}` };
        }

        if (isNaN(max) === false) {
          query.andWhere('product.`price`', '<=', max);
          currentPriceFilter = { key: 'price', operation: '=', value: `${currentPriceFilter.value}-${max}` };
        }
        if (currentPriceFilter) {
          currentFilters.push(currentPriceFilter);
        }
      };

      // Qty filter 
      const qtyFilter = filters.find((f) => f.key === 'qty');
      if (qtyFilter) {
        const [min, max] = qtyFilter.value.split('-').map((v) => parseFloat(v));
        let currentQtyFilter;
        if (isNaN(min) === false) {
          query.andWhere('product.`qty`', '>=', min);
          currentQtyFilter = { key: 'qty', operation: '=', value: `${min}` };
        }

        if (isNaN(max) === false) {
          query.andWhere('product.`qty`', '<=', max);
          currentQtyFilter = { key: 'qty', operation: '=', value: `${currentQtyFilter.value}-${max}` };
        }
        if (currentQtyFilter) {
          currentFilters.push(currentQtyFilter);
        }
      };

      // Name filter
      const nameFilter = filters.find((f) => f.key === 'name');
      if (nameFilter) {
        query.andWhere('des.`name`', 'LIKE', `%${nameFilter.value}%`);
        currentFilters.push({ key: 'name', operation: '=', value: nameFilter.value });
      }

      // Sku filter
      const skuFilter = filters.find((f) => f.key === 'sku');
      if (skuFilter) {
        query.andWhere('product.`sku`', 'LIKE', `%${skuFilter.value}%`);
        currentFilters.push({ key: 'sku', operation: '=', value: skuFilter.value });
      }

      // Status filter
      const statusFilter = filters.find((f) => f.key === 'status');
      if (statusFilter) {
        query.andWhere('product.`status`', '=', statusFilter.value);
        currentFilters.push({ key: 'status', operation: '=', value: statusFilter.value });
      }

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find((f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'price') {
        query.orderBy('product.`price`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else if (sortBy && sortBy.value === 'name') {
        query.orderBy('des.`name`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('product.`product_id`', "DESC");
      };
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(product.`product_id`)', 'total');
      // const total = await cloneQuery.load(pool);
      // console.log('total', total);
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 };// TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit((page.value - 1) * parseInt(limit.value), parseInt(limit.value));
      return {
        itemQuery: query,
        totalQuery: cloneQuery,
        currentFilters: currentFilters,
      }
    }
  },
  Category: {
    products: async (category, { filters = [] }, { filterableAttributes, priceRange }) => {
      const query = await getProductsQuery(category.categoryId);
      const currentFilters = [];
      // Price filter 
      const priceFilter = filters.find((f) => f.key === 'price');
      if (priceFilter) {
        const [min, max] = priceFilter.value.split('-').map((v) => parseFloat(v));
        let currentPriceFilter;
        if (isNaN(min) === false) {
          query.andWhere('product.`price`', '>=', min);
          currentPriceFilter = { key: 'price', value: `${min}` };
        }

        if (isNaN(max) === false) {
          query.andWhere('product.`price`', '<=', max);
          currentPriceFilter = { key: 'price', value: `${currentPriceFilter.value}-${max}` };
        }
        if (currentPriceFilter) {
          currentFilters.push(currentPriceFilter);
        }
      }
      // TODO: Apply category filters

      // Attribute filters
      filters.forEach((filter) => {
        if (filter.key === 'price') {
          return;
        }
        const attribute = filterableAttributes.find((a) => a.attributeCode === filter.key);
        if (attribute) {
          const values = filter.value.split(',')
            .map((v) => parseInt(v))
            .filter((v) => isNaN(v) === false);
          if (values.length > 0) {
            const alias = uniqid();
            query.innerJoin('product_attribute_value_index', alias)
              .on(`${alias}.product_id`, '=', 'product.`product_id`')
              .and(`${alias}.attribute_id`, '=', attribute.attributeId)
              .and(`${alias}.option_id`, 'IN', values);
          }
          currentFilters.push({
            key: filter.key,
            operation: filter.operation,
            value: values.join(',')
          });
        }
      })

      const sortBy = filters.find((f) => f.key === 'sortBy');
      const sortOrder = filters.find((f) => f.key === 'sortOrder' && ['ASC', 'DESC'].includes(f.value)) || { value: 'ASC' };
      if (sortBy && sortBy.value === 'price') {
        query.orderBy('product.`price`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else if (sortBy && sortBy.value === 'name') {
        query.orderBy('product_description.`name`', sortOrder.value);
        currentFilters.push({
          key: 'sortBy',
          operation: '=',
          value: sortBy.value
        });
      } else {
        query.orderBy('product.`product_id`', sortOrder.value);
      };
      if (sortOrder.key) {
        currentFilters.push({
          key: 'sortOrder',
          operation: '=',
          value: sortOrder.value
        });
      }
      // Clone the main query for getting total right before doing the paging
      const cloneQuery = query.clone();
      cloneQuery.select('COUNT(product.`product_id`)', 'total');
      // const total = await cloneQuery.load(pool);
      // console.log('total', total);
      // Paging
      const page = filters.find((f) => f.key === 'page') || { value: 1 };
      const limit = filters.find((f) => f.key === 'limit') || { value: 20 };// TODO: Get from config
      currentFilters.push({
        key: 'page',
        operation: '=',
        value: page.value
      });
      currentFilters.push({
        key: 'limit',
        operation: '=',
        value: limit.value
      });
      query.limit((page.value - 1) * parseInt(limit.value), parseInt(limit.value));
      return {
        itemQuery: query,
        totalQuery: cloneQuery,
        currentFilters: currentFilters,
      }
    },
    availableFilters: async (category, _, { filterableAttributes, priceRange }) => {
      return filterableAttributes;
    },
    url: (category, _, { pool }) => {
      return buildUrl('categoryView', { url_key: category.urlKey });
    },
    editUrl: (category, _, { pool }) => {
      return buildUrl('categoryEdit', { id: category.categoryId });
    },
    image: (category, _, { pool }) => {
      const image = category.image;
      if (!image) {
        return null;
      } else {
        return {
          path: image,
          url: `/assets${image}`
        }
      }
    }
  },
  ProductCollection: {
    items: async ({ itemQuery }, _, { pool }) => {
      return (await itemQuery.execute(pool)).map((row) => camelCase(row));
    },
    total: async ({ totalQuery }, _, { pool }) => {
      return (await totalQuery.load(pool)).total;
    }
  }
}