# Ensure the script stops on any error
$ErrorActionPreference = "Stop"

# Function to log and output messages
function Log-Message {
    param (
        [string]$message
    )
    Write-Host $message
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

# Remove temp and build directories
$pathsToRemove = @(
    "node_modules",
    "dist",
    "gen/projectApi/node_modules",
    "gen/projectApi/dist",
    ".vite",
    "src/.vite",
    "package-lock.json",
    "gen/projectApi/package-lock.json"
)

foreach ($path in $pathsToRemove) {
    Log-Message "Removing directory or file: $path"
    if (-Not (Try-RemoveDirectory -path $path)) {
        Log-Message "Skipping further steps due to removal failure of $path."
        exit 1
    }
}


Log-Message "Script completed successfully."
