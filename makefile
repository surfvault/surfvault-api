deployDev:
	@export AWS_PROFILE=surfvault; \
	sls deploy --stage dev --verbose; \