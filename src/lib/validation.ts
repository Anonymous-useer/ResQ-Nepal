export const validateNepaliPhone = (phone: string): boolean => {
  const phoneRegex = /^(98|97)\d{8}$/;
  return phoneRegex.test(phone);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateImageFile = (file: File): { valid: boolean; message?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, message: 'Image size must be less than 5MB' };
  }

  return { valid: true };
};

export const validateMedicalReportFile = (file: File): { valid: boolean; message?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: 'Only PDF, JPEG, PNG, and WebP files are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, message: 'File size must be less than 10MB' };
  }

  return { valid: true };
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};
