/**
 * frontend/manager-app.js
 *
 * Entry point for the manager (lecturer) page.
 * Instantiates shared service, view, and controller.
 */
const apiService = new AttendanceApiService();
const qrView = new QrView();
const qrController = new QrController(apiService, qrView);

document.addEventListener('DOMContentLoaded', () => qrController.init());
