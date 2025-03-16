/**
 * Form Manager
 * Handles form operations like validation, input handling, etc.
 */

const FormManager = {
  /**
   * Validate required fields
   * @param {Object} formData - Form data object
   * @param {Array<string>} requiredFields - Array of required field names
   * @param {Object} customValidators - Custom validation functions { field: validatorFn }
   * @returns {Object} - { isValid, errors }
   */
  validateForm(formData, requiredFields = [], customValidators = {}) {
    const errors = {};
    let isValid = true;

    // Check required fields
    requiredFields.forEach(field => {
      const value = formData[field];
      if (value === undefined || value === null || value === '') {
        errors[field] = `${field} 是必填项`;
        isValid = false;
      }
    });

    // Apply custom validators
    Object.keys(customValidators).forEach(field => {
      if (formData[field] !== undefined && !errors[field]) {
        const validatorFn = customValidators[field];
        const validationResult = validatorFn(formData[field], formData);
        
        if (validationResult !== true) {
          errors[field] = validationResult;
          isValid = false;
        }
      }
    });

    return { isValid, errors };
  },
  
  /**
   * Handle form input change and update page data
   * @param {Object} page - Page instance
   * @param {Object} e - Input event
   * @param {string} fieldPrefix - Optional prefix for the field in page.data
   */
  handleInputChange(page, e, fieldPrefix = '') {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    if (!field) {
      console.warn('No field specified for input change');
      return;
    }
    
    const dataKey = fieldPrefix ? `${fieldPrefix}.${field}` : field;
    
    const data = {};
    data[dataKey] = value;
    
    page.setData(data);
  },
  
  /**
   * Handle switch/checkbox change and update page data
   * @param {Object} page - Page instance
   * @param {Object} e - Switch/checkbox event
   * @param {string} fieldPrefix - Optional prefix for the field in page.data
   */
  handleSwitchChange(page, e, fieldPrefix = '') {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    if (!field) {
      console.warn('No field specified for switch change');
      return;
    }
    
    const dataKey = fieldPrefix ? `${fieldPrefix}.${field}` : field;
    
    const data = {};
    data[dataKey] = value;
    
    page.setData(data);
  },
  
  /**
   * Reset form data
   * @param {Object} page - Page instance
   * @param {Object} resetValues - Values to reset form fields to
   */
  resetForm(page, resetValues) {
    page.setData(resetValues);
  },
  
  /**
   * Prepare carpool data for submission
   * @param {Object} formData - Form data from page
   * @returns {Object} - API-ready data
   */
  prepareCarpoolData(formData) {
    // Map form field names to API field names (camelCase)
    return {
      type: formData.type,
      content: formData.content,
      wechat: formData.wechat,
      departureTime: formData.departureTime,
      numberOfPeople: formData.peopleChoices ? formData.peopleChoices[formData.peopleIndex] : formData.number_of_people,
      shareFare: formData.shareFare === true,
      status: formData.status || 'STILL_LOOKING'
    };
  }
};

export default FormManager; 