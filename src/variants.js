const get = ({ optionsLists = [] }) => {
  optionsLists = optionsLists || [];

  const options = optionsLists.map((list) => {
    return {
      id: list.skuPropertyId,
      name: list.skuPropertyName,
      values: list.skuPropertyValues.map((val) => {
        return {
          id: val.propertyValueId,
          name: val.propertyValueName,
          displayName: val.propertyValueDisplayName,
          image: val.skuPropertyImagePath,
        };
      }),
    };
  });

  return {
    options: options
  };
};

module.exports = { get };
