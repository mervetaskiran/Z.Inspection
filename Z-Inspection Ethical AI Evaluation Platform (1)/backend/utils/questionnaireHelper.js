/**
 * Helper functions for questionnaire management
 */

/**
 * Get the correct questionnaire key for a role
 * @param {string} role - User role (e.g., 'ethical-expert', 'medical-expert')
 * @returns {string} Questionnaire key
 */
function getQuestionnaireKeyForRole(role) {
  const roleToQuestionnaire = {
    'ethical-expert': 'ethical-expert-v1',
    'medical-expert': 'medical-expert-v1',
    'technical-expert': 'technical-expert-v1',
    'legal-expert': 'legal-expert-v1',
    'education-expert': 'education-expert-v1'
  };
  
  return roleToQuestionnaire[role] || 'general-v1';
}

/**
 * Get the list of questionnaires assigned to a role
 * @param {string} role - User role
 * @returns {string[]} Array of questionnaire keys
 */
function getQuestionnairesForRole(role) {
  const roleSpecificKey = getQuestionnaireKeyForRole(role);
  
  // All roles get general-v1, plus their role-specific questionnaire
  if (roleSpecificKey === 'general-v1') {
    return ['general-v1'];
  }
  
  return ['general-v1', roleSpecificKey];
}

/**
 * Validate that a questionnaire key is valid for a role
 * @param {string} questionnaireKey - Questionnaire key to validate
 * @param {string} role - User role
 * @returns {boolean} True if valid
 */
function isValidQuestionnaireForRole(questionnaireKey, role) {
  const allowedQuestionnaires = getQuestionnairesForRole(role);
  return allowedQuestionnaires.includes(questionnaireKey);
}

module.exports = {
  getQuestionnaireKeyForRole,
  getQuestionnairesForRole,
  isValidQuestionnaireForRole
};



