# Deploying Arsenal Dashboard to Fly.io

This guide walks you through deploying the Arsenal FC Dashboard Flask application to Fly.io with persistent SQLite database storage.

## Prerequisites

- A Fly.io account (sign up at https://fly.io)
- flyctl CLI tool installed on your local machine

## Step 1: Install flyctl

### macOS/Linux
```bash
curl -L https://fly.io/install.sh | sh
```

### Windows (PowerShell)
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

For other installation methods, visit: https://fly.io/docs/hands-on/install-flyctl/

## Step 2: Authenticate with Fly.io

```bash
flyctl auth login
```

This will open your browser for authentication.

## Step 3: Create Your Fly.io Application

Navigate to your project directory and launch the app:

```bash
flyctl launch
```

When prompted:
- Choose an app name (or let Fly.io generate one)
- Select a region close to your users
- **Do NOT deploy yet** when asked - we need to set up the volume first
- Answer "No" to PostgreSQL database and Redis

Alternatively, if you want to use a specific app name, edit the `fly.toml` file and change:
```toml
app = "your-app-name"
```
to your desired app name.

## Step 4: Create a Persistent Volume

The SQLite database needs to persist between deployments. Create a volume:

```bash
flyctl volumes create arsenal_data --size 1 --region <your-region>
```

Replace `<your-region>` with your chosen region (e.g., `iad` for US East).

**Note:** The volume name `arsenal_data` must match the `source` in the `[mounts]` section of `fly.toml`.

## Step 5: Initialize the Database

Before deploying, you need to ensure your database is set up. You have two options:

### Option A: Use existing local database
If you have a populated `arsenal.db` locally, you'll need to upload it after first deployment (see Step 7).

### Option B: Initialize on first run
The application will create an empty database if it doesn't exist. You can then run the initialization script via SSH (see Step 8).

## Step 6: Deploy the Application

```bash
flyctl deploy
```

This will:
- Build the Docker image
- Push it to Fly.io's registry
- Deploy your application
- Make it available at `https://<your-app-name>.fly.dev`

## Step 7: Upload Your Database (Optional)

If you have an existing `arsenal.db` file locally that you want to use:

```bash
flyctl ssh console
cd /app/data
exit
```

Then from your local machine:
```bash
flyctl ssh sftp shell
put arsenal.db /app/data/arsenal.db
exit
```

Alternatively, use `flyctl ssh console` to run the init script inside the container:
```bash
flyctl ssh console
cd /app
python init_db.py
exit
```

## Step 8: Initialize Database with Data (If needed)

If you need to populate the database, SSH into your container:

```bash
flyctl ssh console
```

Then run:
```bash
cd /app
python init_db.py
```

The CSV files (`matches.csv` and `players.csv`) should already be in the container.

## Step 9: Verify Deployment

Check your application:
```bash
flyctl open
```

Or visit: `https://<your-app-name>.fly.dev`

Test the API endpoint:
```bash
curl https://<your-app-name>.fly.dev/api/test
```

## Managing Your Deployment

### View logs
```bash
flyctl logs
```

### Check application status
```bash
flyctl status
```

### Scale your application (if needed)
```bash
flyctl scale count 2
```

### SSH into your container
```bash
flyctl ssh console
```

### Restart your application
```bash
flyctl apps restart
```

### Update environment variables
```bash
flyctl secrets set DATABASE_PATH=/app/data/arsenal.db
```

### View volume details
```bash
flyctl volumes list
```

## Troubleshooting

### Database not found
- Ensure the volume is mounted correctly at `/app/data`
- Check that `DATABASE_PATH` is set to `/app/data/arsenal.db`
- Verify the database file exists: `flyctl ssh console` then `ls -la /app/data/`

### Application won't start
- Check logs: `flyctl logs`
- Verify the Dockerfile builds locally: `docker build -t arsenal-test .`
- Ensure all dependencies are in `requirements.txt`

### Health check failures
- The health check uses `/api/test` endpoint
- Ensure the database is accessible and the endpoint works
- Check logs for any startup errors

### Database is empty
- SSH into the container and run `python init_db.py`
- Or upload your local database file using sftp

## Production Considerations

1. **Backups**: Regularly backup your database
   ```bash
   flyctl ssh sftp shell
   get /app/data/arsenal.db ./backup-arsenal.db
   ```

2. **Monitoring**: Set up monitoring and alerts in the Fly.io dashboard

3. **Scaling**: Consider scaling up if you have high traffic
   ```bash
   flyctl scale vm shared-cpu-2x
   ```

4. **Security**: 
   - Keep dependencies updated
   - Use secrets for sensitive data
   - Enable HTTPS (already configured in fly.toml)

## Updating Your Application

When you make code changes:

1. Test locally
2. Commit changes to git
3. Deploy:
   ```bash
   flyctl deploy
   ```

The database in the persistent volume will not be affected by redeployments.

## Additional Resources

- Fly.io Documentation: https://fly.io/docs/
- Flask Documentation: https://flask.palletsprojects.com/
- SQLite Documentation: https://www.sqlite.org/docs.html
