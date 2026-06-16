const express = require('express');
const externalApiController = require('../controllers/externalApiController');
const { requireApiScope } = require('../middleware/externalApiAuth');
const { requireExternalIdempotency } = require('../middleware/externalApiIdempotency');

const router = express.Router();

router.get('/', externalApiController.apiInfo);
router.get('/employees', requireApiScope('employees.read'), externalApiController.listEmployees);
router.post('/attendance/marks', requireApiScope('attendance.write'), requireExternalIdempotency, externalApiController.createAttendanceMark);
router.post('/novelties', requireApiScope('novelties.write'), requireExternalIdempotency, externalApiController.createNovelty);
router.get('/payroll/:anio/:mes', requireApiScope('payroll.read'), externalApiController.listPayroll);

module.exports = router;
