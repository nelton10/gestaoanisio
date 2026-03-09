import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irhdpsguhekzduqropln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaGRwc2d1aGVremR1cXJvcGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTc3NDEsImV4cCI6MjA4ODU5Mzc0MX0.6-qOSy5fyMYzlyFi-6e9Sci69-yk28MAj3xdEFjKAvw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSuspension() {
    const ts = new Date().toLocaleString('pt-PT');

    const hRecord = {
        id: 'test-hist-id-123',
        aluno_id: 'tesste',
        aluno_nome: 'tesste',
        turma: 'a',
        categoria: 'coordenação',
        detalhe: 'SUSPENSÃO DE TESTE',
        timestamp: ts,
        raw_timestamp: Date.now(),
        professor: 'Teste'
    };

    const dbS = {
        id: 'test-susp-id-123',
        aluno_id: 'tesste',
        aluno_nome: 'tesste',
        turma: 'a',
        return_date: '2026-03-10',
        timestamp: ts
    };

    console.log('Testing history insert...');
    const res1 = await supabase.from('history').insert([hRecord]);
    if (res1.error) {
        console.error('History Error:', res1.error);
    } else {
        console.log('History Inserted!');
    }

    console.log('Testing suspension insert...');
    const res2 = await supabase.from('suspensions').insert([dbS]);
    if (res2.error) {
        console.error('Suspension Error:', res2.error);
    } else {
        console.log('Suspension Inserted!');
    }
}

testSuspension();
