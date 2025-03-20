deployDev:
	@export AWS_PROFILE=surfvault; \
	npx serverless@4 deploy --stage dev --verbose; \