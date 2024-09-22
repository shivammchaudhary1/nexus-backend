// Validation function for password
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/;
    return (
      passwordRegex.test(password) &&
      password.length >= 6
    );
  };
  
  // Validation function for email
  const isValidEmail = (email) => {
    const emailRegex = /^\w+([.-]\w+)*@\w+([.-]\w+)*(\.\w{2,})+$/;
    return emailRegex.test(email);
  };
  
module.exports = { isValidPassword, isValidEmail };
  