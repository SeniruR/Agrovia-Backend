#!/usr/bin/env python3
"""
Cleanup script to remove unnecessary files from the Agrovia Backend project.
Run this script to clean up test files and temporary files.
"""

import os
import sys

def cleanup_files():
    """Remove unnecessary files from the project."""
    
    # Files to delete
    files_to_delete = [
        'test_conditions.py',
        'test_import.py', 
        'test_recommendations.py',
        'data_sources_explanation.py',
        'train_models.py',  # Optional - keep if you want to retrain models
        'ml/data.py',
        'ml/recommendation_new.py'
    ]
    
    print("🧹 AGROVIA BACKEND CLEANUP")
    print("=" * 50)
    print("This will delete the following files:")
    
    existing_files = []
    for file_path in files_to_delete:
        if os.path.exists(file_path):
            existing_files.append(file_path)
            file_size = os.path.getsize(file_path) / 1024  # KB
            print(f"  ❌ {file_path} ({file_size:.1f} KB)")
        else:
            print(f"  ⚠️  {file_path} (not found)")
    
    if not existing_files:
        print("\n✅ No files to delete - project is already clean!")
        return
    
    print(f"\n📊 Total files to delete: {len(existing_files)}")
    total_size = sum(os.path.getsize(f) for f in existing_files) / 1024
    print(f"💾 Total space to free: {total_size:.1f} KB")
    
    # Confirm deletion
    response = input("\n❓ Delete these files? (y/N): ").lower().strip()
    
    if response in ['y', 'yes']:
        deleted_count = 0
        for file_path in existing_files:
            try:
                os.remove(file_path)
                print(f"  ✅ Deleted: {file_path}")
                deleted_count += 1
            except Exception as e:
                print(f"  ❌ Error deleting {file_path}: {e}")
        
        print(f"\n🎉 Cleanup complete! Deleted {deleted_count} files.")
        print("\n✅ CORE SYSTEM FILES PRESERVED:")
        print("  📁 app.py - Main Flask application")
        print("  📁 ml/recommendation.py - Core recommendation logic") 
        print("  📁 ml/data_analyzer.py - Data insights engine")
        print("  📁 ml/*.pkl - Trained ML models")
        print("  📁 ml/crop_yield.csv - Real farm data")
        print("  📁 requirements.txt - Dependencies")
    else:
        print("\n🚫 Cleanup cancelled - no files deleted.")

if __name__ == "__main__":
    cleanup_files()
