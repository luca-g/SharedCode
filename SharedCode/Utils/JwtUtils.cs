using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Global
{
    public class JwtUtils
    {
        private const string DefaultTokenKey = "token";
        private static byte[]? _key;
        private static string? _tokenKey;
        private static double _expireHours = 1;
        public static string TokenKey => _tokenKey ?? "";
        public class JwtSettings
        {
            public required string SecretKey { get; set; }
            public string? TokenKey { get; set; }
            public double? ExpireHours { get; set; }
        }
        public static void LoadConfiguration(IConfiguration configuration)
        {
            var jwtConfiguration = new JwtSettings() { SecretKey = "" };
            configuration.GetSection("JwtSettings").Bind(jwtConfiguration);
            if (string.IsNullOrEmpty(jwtConfiguration?.SecretKey))
                throw new Exception("JwtConfiguration is not set in appsettings.json");
            _key = Encoding.ASCII.GetBytes(jwtConfiguration.SecretKey);
            _tokenKey = jwtConfiguration.TokenKey ?? DefaultTokenKey;
            _expireHours = jwtConfiguration.ExpireHours ?? _expireHours;

        }
        public static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            LoadConfiguration(configuration);
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateIssuerSigningKey = false,
                    IssuerSigningKey = new SymmetricSecurityKey(_key),
                    ValidateLifetime = true
                };

                // Configure JWT to be read from cookies and headers
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if(_tokenKey==null)
                            throw new Exception("Token key _tokenKey is not set");
                        context.Token = context.Request.Cookies[_tokenKey] ?? context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
                        return Task.CompletedTask;
                    }
                };
            });
        }
        public static IEnumerable<Claim> GetClaims(string userId, string? userName, string? email)
        {
            var claims = new List<Claim>();
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
            if (userName != null)
                claims.Add(new Claim(ClaimTypes.Name, userName));
            if (email != null)
                claims.Add(new Claim(ClaimTypes.Email, email));
            return claims.AsEnumerable();
        }
        public static string GetTokenString(IEnumerable<Claim>? claims = null)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(_expireHours),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(_key)
                    , SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return tokenString;
        }
        public static void AddTokenToResponseCookie(HttpResponse response, string tokenString)
        {
            if (_tokenKey == null)
                throw new Exception("Token key is not set");

            response.Cookies.Append(_tokenKey, tokenString, new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Ensure this matches the protocol you are using
                //SameSite = SameSiteMode.Strict,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddHours(_expireHours)
            });
        }
    }
}
