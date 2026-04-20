import subprocess, json, re, os, glob

result = subprocess.run(
    ['manus-mcp-cli', 'tool', 'call', 'execute_sql', '--server', 'supabase', '--input',
     json.dumps({
         "project_id": "dfsbzsxuursvqwnzruqt",
         "query": "SELECT id, order_index FROM curriculum_modules WHERE exam_language = 'ar' ORDER BY order_index;"
     })],
    capture_output=True, text=True
)

# Read from the saved result file (JSON format)
result_files = sorted(glob.glob('/home/ubuntu/.mcp/tool-results/*.json'), key=os.path.getmtime, reverse=True)
if result_files:
    raw = open(result_files[0]).read()
    # Parse the outer JSON
    outer = json.loads(raw)
    result_str = outer.get('result', '')
    # Extract the array from the result string using regex
    arr_match = re.search(r'\[.*\]', result_str, re.DOTALL)
    if arr_match:
        data = json.loads(arr_match.group(0))
        modules = {str(row['order_index']): row['id'] for row in data}
        print("Module IDs found:", len(modules))
        for k, v in sorted(modules.items(), key=lambda x: int(x[0])):
            print(f"  Module {k}: {v}")
        
        with open('/home/ubuntu/bdaportal/ar_module_ids.json', 'w') as f:
            json.dump(modules, f, indent=2)
        print("\nSaved to ar_module_ids.json")
    else:
        print("Could not find array in result")
        print(result_str[:300])
else:
    print("No result files found")
