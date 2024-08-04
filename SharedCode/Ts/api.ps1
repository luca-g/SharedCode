# Ensure the script stops on any error
$ErrorActionPreference = "Stop"

# Function to log and output messages
function Log-Message {
    param (
        [string]$message
    )
    Write-Host $message
}

# Function to check the last command's exit status and handle errors
function Check-LastCommand {
    param (
        [string]$errorMessage
    )
    if ($LASTEXITCODE -ne 0) {
        Log-Message $errorMessage
        exit $LASTEXITCODE
    }
}

# Function to print the current directory
function Print-CurrentDirectory {
    Log-Message ("Current directory: " + (Get-Location).Path)
}

# Function to try removing the directory multiple times
function Try-RemoveDirectory {
    param (
        [string]$path,
        [int]$maxRetries = 5,
        [int]$delaySeconds = 2
    )
    for ($i = 0; $i -lt $maxRetries; $i++) {
        if (-Not (Test-Path -Path $path)) {
            Log-Message "Directory '$path' does not exist."
            return $true
        }
        try {
            Remove-Item -Recurse -Force -Path $path
            Log-Message "Directory removed successfully."
            return $true
        } catch {
            Log-Message "Attempt $($i + 1) to remove directory failed. Retrying in $delaySeconds seconds..."
            Start-Sleep -Seconds $delaySeconds
        }
    }
    Log-Message "Failed to remove directory after $maxRetries attempts."
    return $false
}

# Print the current directory before removing API directory
Print-CurrentDirectory

# Remove the existing generated API directory if it exists
Log-Message "Removing existing API directory..."
if (-Not (Try-RemoveDirectory -path "gen/projectApi")) {
    Log-Message "Skipping further steps due to directory removal failure."
    exit 1
}

# Set Java options for openapi-generator-cli
$env:JAVA_OPTS="-Dio.swagger.parser.util.RemoteUrl.trustAll=true -Dio.swagger.v3.parser.util.RemoteUrl.trustAll=true"

# Generate the API client using openapi-generator-cli
Log-Message "Generating API client..."
openapi-generator-cli generate -i https://localhost:44357/swagger/v1/swagger.json --generator-name typescript-axios -o gen/projectApi --config api-projectApi.json
Check-LastCommand "API client generation failed."
Log-Message "API client generated successfully."

# Print the current directory before changing to generated API directory
Print-CurrentDirectory

# Change to the generated API directory
Set-Location -Path "gen/projectApi"
Check-LastCommand "Failed to change to generated API directory."
Log-Message "Changed to generated API directory."

# Print the current directory after changing to generated API directory
Print-CurrentDirectory

# Install npm dependencies for the generated API
Log-Message "Installing dependencies..."
npm install
Check-LastCommand "Dependency installation failed."
Log-Message "Dependencies installed successfully."

# Build the generated API
Log-Message "Building API client..."
npm run build
Check-LastCommand "API client build failed."
Log-Message "API client built successfully."

# Link the generated API globally
#Log-Message "Linking API client globally..."
#npm link
#Check-LastCommand "Failed to link API client globally."
#Log-Message "API client linked globally successfully."

# Remove node_modules from the generated API to avoid duplication
Log-Message "Removing node_modules from generated API..."
Remove-Item -Recurse -Force "node_modules"
Check-LastCommand "Failed to remove node_modules from generated API."
Log-Message "node_modules removed successfully."

# Print the current directory before changing to the root directory
Print-CurrentDirectory

# Change back to the root directory
Set-Location -Path "../.."
Check-LastCommand "Failed to change to root directory."
Log-Message "Changed to root directory."

# Print the current directory before changing to src directory
Print-CurrentDirectory

Copy-Item -Path "gen\projectApi-package\package.json" -Destination "gen\projectApi\dist" -Force -Verbose



# Change to the src directory
#Log-Message "Changing to src directory..."
#Set-Location -Path "./src"
#Check-LastCommand "Failed to change to src directory."

# Print the current directory after changing to src directory
#Print-CurrentDirectory

# Link the generated API in the main project
#Log-Message "Linking generated API in main project..."
#npm install link projectApi
#Check-LastCommand "Failed to link generated API in main project."
#Log-Message "Generated API linked in main project successfully."

npm install gen\projectApi\dist --save

Log-Message "Script completed successfully."
