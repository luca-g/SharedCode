using Microsoft.Extensions.Configuration;
namespace Global
{
    public class SecretsFile
    {
        public static IConfigurationRoot GetConfiguration(string? appSettingsPathName)
        {
            try
            {
                if (appSettingsPathName == null)
                {
                    appSettingsPathName = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
                }
                if (!File.Exists(appSettingsPathName))
                {
                    throw new FileNotFoundException($"app settings file not found {appSettingsPathName}");
                }
                return new ConfigurationBuilder()
                    .SetBasePath(Path.GetDirectoryName(appSettingsPathName)!)
                    .AddJsonFile(Path.GetFileName(appSettingsPathName))
                    .Build();
            }
            catch (Exception ex)
            {
                throw new Exception("GetConfiguration error", ex);
            }
        }
        public static string GetSecretFilePathNameFromConfiguration(string? appSettingsPathName, string secretKeyInConfiguration = "secrets-file")
        {
            IConfigurationRoot? configuration = null;
            configuration = GetConfiguration(appSettingsPathName);
            if (configuration == null)
            {
                throw new FileNotFoundException($"configuration file not found on {appSettingsPathName}");
            }
            string? secretPathName = null;
            try
            {
                secretPathName = configuration.GetValue<string>(secretKeyInConfiguration);
                if (string.IsNullOrWhiteSpace(secretPathName))
                {
                    throw new MissingFieldException($"configuration file {appSettingsPathName} does not contain secret path name {secretKeyInConfiguration}");
                }
                return secretPathName;
            }
            catch (Exception ex)
            {
                throw new Exception($"error loading secret configuration file from parent {appSettingsPathName} cofiguration {secretPathName ?? "null"}", ex);
            }
        }
        public static IConfigurationRoot GetSecretConfiguration(string? appSettingsPathName, string secretKeyInConfiguration = "secrets-file")
        {
            var secretConfigurationPath = GetSecretFilePathNameFromConfiguration(appSettingsPathName, secretKeyInConfiguration);
            var configuration = GetConfiguration(secretConfigurationPath);
            return configuration;
        }
    }
}
